import test from "node:test"
import assert from "node:assert/strict"
import { execFileSync, execFile } from "node:child_process"
import { promisify } from "node:util"
import { readFileSync } from "node:fs"

// 전용 로컬 DB에서만 실행한다. 운영 DB 연결은 허용하지 않는다.
const url = process.env.EVENT_TEST_DATABASE_URL
const run = promisify(execFile)
test("PostgreSQL: 일정 수정·삭제 버전 검사 및 동시 처리", { skip: !url }, async t => {
  const parsed = new URL(url)
  assert.ok(["127.0.0.1", "localhost"].includes(parsed.hostname))
  assert.equal(parsed.pathname, "/event_concurrency_test")
  const args = [url, "-X", "-qAt", "-v", "ON_ERROR_STOP=1"]
  const sql = text => execFileSync("psql", args, { input: text, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim()
  sql(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE TABLE events (id uuid PRIMARY KEY, category text NOT NULL, title text NOT NULL,
      description text, location text, starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
      all_day boolean NOT NULL DEFAULT false, signup_enabled boolean NOT NULL DEFAULT false,
      visibility text DEFAULT 'public', custom_label text, custom_color text, recurrence_group_id uuid,
      updated_at timestamptz NOT NULL DEFAULT now(), CHECK (ends_at >= starts_at));
    CREATE FUNCTION update_updated_at_column() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
    CREATE TRIGGER trg_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`)
  sql(readFileSync("supabase/migrations/20261027000001_checked_event_mutations.sql", "utf8"))
  const ids = [1,2,3].map(n => `00000000-0000-4000-8000-${String(n).padStart(12,"0")}`)
  const reset = () => sql(`TRUNCATE events; INSERT INTO events(id,title,category,starts_at,ends_at,recurrence_group_id)
    VALUES ${ids.map((id,i) => `('${id}','일정','event','2026-11-${10+i} 06:00Z','2026-11-${10+i} 07:00Z','00000000-0000-4000-8000-000000000099')`).join(",")};`)
  const snapshot = () => JSON.parse(sql("SELECT json_agg(json_build_object('id',id,'updated_at',updated_at) ORDER BY id) FROM events"))
  const fields = { title:"변경",category:"event",starts_at:"2026-11-10T06:30:00Z",ends_at:"2026-11-10T08:00:00Z", visibility:"public" }
  const call = (expected, operation="update", scope="one", id=ids[0], data=fields) =>
    `SELECT mutate_event_checked('${id}','${scope}','${operation}','${JSON.stringify(expected)}'::jsonb,'${JSON.stringify(data)}'::jsonb);`
  await t.test("단건 수정 후 오래된 수정·삭제 모두 차단", () => {
    reset(); const rev=[snapshot()[0]]; sql(call(rev));
    assert.throws(()=>sql(call(rev)), /EVENT_REVISION_CONFLICT/)
    assert.throws(()=>sql(call(rev,"delete")), /EVENT_REVISION_CONFLICT/)
    assert.equal(sql(`SELECT title FROM events WHERE id='${ids[0]}'`),"변경")
  })
  await t.test("삭제된 일정 및 버전 누락 차단", () => {
    reset(); const rev=[snapshot()[0]]; sql(call(rev,"delete"));
    assert.throws(()=>sql(call(rev)),/EVENT_REVISION_CONFLICT/)
    assert.throws(()=>sql(call([],"delete","all",ids[1])),/EVENT_REVISION_CONFLICT/)
    assert.equal(sql("SELECT count(*) FROM events"),"2")
  })
  await t.test("반복 일정 하나가 변경되면 전체 수정·삭제 롤백", () => {
    for (const scope of ["all","after"]) for (const op of ["update","delete"]) {
      reset(); const rev=snapshot(); sql(`UPDATE events SET title='먼저 변경' WHERE id='${ids[2]}'`)
      const before=sql("SELECT json_agg(e ORDER BY id) FROM events e")
      assert.throws(()=>sql(call(rev,op,scope)),/EVENT_REVISION_CONFLICT/)
      assert.equal(sql("SELECT json_agg(e ORDER BY id) FROM events e"),before)
    }
  })
  await t.test("반복 그룹 추가·누락 및 잘못된 입력은 부분 변경 없음", () => {
    reset(); const rev=snapshot(); sql(`DELETE FROM events WHERE id='${ids[2]}'`)
    assert.throws(()=>sql(call(rev,"delete","all")),/EVENT_REVISION_CONFLICT/)
    reset(); const before=sql("SELECT json_agg(e ORDER BY id) FROM events e")
    assert.throws(()=>sql(call(snapshot(),"update","all",ids[0],{...fields,ends_at:"2026-11-09T00:00:00Z"})),/INVALID_EVENT_FIELDS/)
    assert.equal(sql("SELECT json_agg(e ORDER BY id) FROM events e"),before)
    assert.throws(()=>sql(call(snapshot().slice(0,2),"delete","all")),/EVENT_REVISION_CONFLICT/)
  })
  await t.test("이후 일정 수정은 날짜·지속시간 보존, 전체 삭제 정상", () => {
    reset(); sql(call(snapshot(),"update","after",ids[1]));
    assert.equal(sql(`SELECT title FROM events WHERE id='${ids[0]}'`),"일정")
    assert.equal(sql(`SELECT extract(epoch from ends_at-starts_at)::int FROM events WHERE id='${ids[1]}'`),"5400")
    sql(call(snapshot(),"delete","all")); assert.equal(sql("SELECT count(*) FROM events"),"0")
  })
  await t.test("두 연결의 동시 수정/삭제 중 한 요청만 성공", async () => {
    for (const op of ["update","delete"]) {
      reset(); const rev=[snapshot()[0]];
      const first = run("psql", [...args,"-c",`SET application_name='event_lock_test'; BEGIN; ${call(rev)} SELECT pg_sleep(0.5); COMMIT;`])
      let locked = false
      for (let attempt=0; attempt<30; attempt++) {
        locked = sql("SELECT count(*) FROM pg_stat_activity WHERE application_name='event_lock_test' AND wait_event='PgSleep'") === "1"
        if (locked) break
        await new Promise(resolve=>setTimeout(resolve,10))
      }
      assert.ok(locked, "첫 연결이 수정 후 잠금을 보유하는 동안 두 번째 요청 시작")
      const results=await Promise.allSettled([first, run("psql", [...args,"-c",call(rev,op)])])
      assert.equal(results.filter(r=>r.status==="fulfilled").length,1)
      assert.match(results.find(r=>r.status==="rejected").reason.stderr,/EVENT_REVISION_CONFLICT/)
    }
  })
  await t.test("일반 사용자 RPC 직접 호출 거부", () => {
    reset(); assert.throws(()=>sql(`SET ROLE authenticated; ${call([snapshot()[0]])}`),/permission denied/)
  })
})
