import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import vm from "node:vm"
import ts from "typescript"

function load(file, imports = {}) {
  const exports = {}
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(code, { exports, Date, FormData, console: { error() {} }, require(name) {
    assert.ok(name in imports, `Unexpected dependency: ${name}`)
    return imports[name]
  } })
  return exports
}

const hours = load("src/features/applications/lib/volunteer-operating-hours.ts")
const descriptions = load("src/features/events/lib/description.ts")
test("retired activities are hidden in linked calendar descriptions without changing other notes", () => {
  const description = "희망 활동: 산책, 청소·정리\r\n요청 시간대: 10:00\r\n메모: 행사 지원\r\n준비물 안내"
  assert.equal(descriptions.eventDescriptionForDisplay({ source_application_type: "volunteer", description }), "요청 시간대: 10:00\n메모: 행사 지원\n준비물 안내")
  assert.equal(descriptions.eventDescriptionForDisplay({ source_application_type: null, description }), description)
  assert.equal(descriptions.eventDescriptionForDisplay({ source_application_type: "volunteer", description: "희망 활동: 산책" }), null)
  assert.equal(descriptions.eventDescriptionForDisplay({ source_application_type: "volunteer", description: null }), null)
})
test("KST today handles midnight, month and year boundaries", () => {
  for (const [instant, expected] of [
    ["2026-10-01T14:59:59Z", "2026-10-01"],
    ["2026-10-01T15:00:00Z", "2026-10-02"],
    ["2026-10-31T15:00:00Z", "2026-11-01"],
    ["2026-12-31T15:00:00Z", "2027-01-01"],
  ]) assert.equal(hours.volunteerToday(new Date(instant)), expected)
})

test("past dates fail while today/future dates retain strict 17:00 cutoff", () => {
  const now = new Date("2026-10-01T15:00:00Z")
  for (const dates of [["2026-10-01"], ["2026-10-01", "2026-10-03"]]) assert.match(hours.validateVolunteerSchedule(dates, "10:00", now), /지난 날짜/)
  for (const date of ["2026-10-02", "2026-10-03"]) {
    for (const time of ["10:00", "11:00", "13:00", "17:00"]) assert.equal(hours.validateVolunteerSchedule([date], time, now), null)
    for (const time of ["09:50", "11:10", "12:00", "17:10", "17:50"]) assert.ok(hours.validateVolunteerSchedule([date], time, now))
  }
  for (const date of ["2026-02-30", "2026-13-01", "invalid"]) assert.ok(hours.validateVolunteerSchedule([date], "10:00", now))
  assert.ok(hours.getVolunteerTimeOptions(["2020-01-01"]).includes("10:00"), "Historical display options stay available")
})

function actions({ authorized = false, rpcError = null } = {}) {
  const calls = []
  const imports = {
    "next/cache": { revalidatePath: path => calls.push(["revalidate", path]) },
    "next/navigation": { redirect: path => { throw new Error(`redirect:${path}`) } },
    "@/shared/lib/auth": { requireAdmin: async () => { calls.push(["auth"]); return authorized ? { ok: true, userId: "staff" } : { ok: false, error: "권한 없음" } } },
    "@/shared/lib/supabase/admin": { createAdminClient: () => { calls.push(["admin"]); return { rpc: async (name, input) => { calls.push([name, input]); return { error: rpcError } }, from: () => { throw Error("Nonatomic writes are forbidden") } } } },
    "@/shared/lib/supabase/server": {},
    "@/features/events/lib/date": {},
    "@/features/events/types": {},
    "../lib/volunteer-applicant": {},
    "../lib/volunteer-operating-hours": hours,
    "@/shared/lib/validation": {},
    "@/shared/lib/utils": { extractImagesFromHtml: () => [] },
  }
  return { calls, applications: load("src/features/applications/api/mutations.ts", imports), daily: load("src/features/daily/api/mutations.ts", imports) }
}

test("unauthorized deletion never obtains elevated client", async () => {
  const { applications, daily, calls } = actions()
  for (const action of [applications.deleteVolunteerApplication, applications.deleteAdoptionApplication]) assert.equal((await action("id")).error, "권한 없음")
  assert.equal((await applications.updateAdoptionApplication("id", new FormData())).error, "권한 없음")
  assert.equal((await daily.bulkDeleteDailyPosts(["id"])).error, "권한 없음")
  assert.equal(calls.filter(([type]) => type === "admin").length, 0)
})

test("authorized deletes use one atomic RPC and redirect only on success", async () => {
  for (const type of ["volunteer", "adoption"]) {
    const { applications, calls } = actions({ authorized: true })
    const action = type === "volunteer" ? applications.deleteVolunteerApplication : applications.deleteAdoptionApplication
    await assert.rejects(action("application-id"), /redirect:\/admin\/applications/)
    assert.equal(calls[0][0], "auth")
    const rpc = calls.filter(([name]) => name === "delete_application_with_events")
    assert.equal(rpc.length, 1)
    assert.equal(rpc[0][1].p_application_type, type)
    assert.equal(rpc[0][1].p_application_id, "application-id")
  }
})

test("RPC failure has no fallback partial delete or success redirect", async () => {
  const { applications, calls } = actions({ authorized: true, rpcError: { message: "RPC unavailable" } })
  assert.equal((await applications.deleteVolunteerApplication("id")).error, "RPC unavailable")
  assert.equal(calls.filter(([name]) => name === "revalidate").length, 0)
})

test("crafted old certification form is rejected before database access", async () => {
  const { daily, calls } = actions()
  const form = new FormData()
  form.set("title", "봉사 인증")
  form.set("related_volunteer_application_id", "future-application")
  assert.match((await daily.createDailyPost(form)).error, /종료/)
  assert.equal(calls.length, 0)
})

test("ordinary member can create donation story without certification or promotion", async () => {
  let inserted
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: "member" } } }) },
    from(table) {
      const chain = {
        select() { return this }, eq() { return this },
        maybeSingle: async () => ({ data: { id: "member", role: "member", status: "approved", is_banned: false } }),
        insert(value) { assert.equal(table, "daily_posts"); inserted = value; return this },
        single: async () => ({ data: { id: "post" }, error: null }),
      }
      return chain
    },
  }
  const api = load("src/features/daily/api/mutations.ts", {
    "next/cache": { revalidatePath() {} }, "@/shared/lib/auth": {},
    "@/shared/lib/supabase/admin": { createAdminClient: () => { throw Error("Must not promote") } },
    "@/shared/lib/supabase/server": { createClient: async () => client },
    "@/shared/lib/utils": { extractImagesFromHtml: () => [] },
    "@/features/push": { sendPushSystem: async () => {} },
  })
  const form = new FormData()
  form.set("title", "후원 이야기")
  form.set("category", "후원")
  assert.equal((await api.createDailyPost(form)).error, undefined)
  assert.equal(inserted.category, "후원")
  assert.equal(inserted.created_by, "member")
  assert.equal("related_volunteer_application_id" in inserted, false)
})

test("volunteer approval retains append, approval-only keep and reschedule replace semantics", async () => {
  for (const [mode, previousStatus, action] of [["with_schedule", "접수", "append"], ["approval_only", "접수", "keep"], ["with_schedule", "일정변경요청", "replace"]]) {
    let rpcInput
    const api = load("src/features/applications/api/mutations.ts", {
      "next/cache": { revalidatePath() {} }, "next/navigation": {},
      "@/shared/lib/auth": { requireAdmin: async () => ({ ok: true, userId: "staff" }) },
      "@/shared/lib/supabase/server": {},
      "@/shared/lib/supabase/admin": { createAdminClient: () => ({
        from(table) {
          assert.equal(table, "volunteer_applications")
          return { select() { return this }, eq() { return this }, maybeSingle: async () => ({ data: { id: "app", status: previousStatus, updated_at: "2026-10-08T00:00:00+00:00", available_dates: ["2099-10-10", "2099-10-10"], available_time: "17:00", reschedule_dates: ["2099-10-11"], reschedule_time: "10:00", created_by: null } }) }
        },
        rpc: async (name, input) => { assert.equal(name, "process_volunteer_application_checked"); assert.equal(input.p_expected_status, previousStatus); assert.equal(input.p_expected_updated_at, "2026-10-08T00:00:00+00:00"); rpcInput = input; return { error: null } },
      }) },
      "@/features/events/lib/date": load("src/features/events/lib/date.ts"),
      "@/features/events/types": {}, "../lib/volunteer-applicant": {},
      "../lib/volunteer-operating-hours": hours, "@/shared/lib/validation": {},
    })
    const form = new FormData()
    form.set("status", "승인")
    form.set("schedule_mode", mode)
    assert.equal((await api.updateVolunteerApplication("app", form)).id, "app")
    assert.equal(rpcInput.p_schedule_action, action)
    assert.equal(rpcInput.p_schedule_starts.length, action === "keep" ? 0 : 1)
    if (action === "append") assert.equal(rpcInput.p_schedule_starts[0], "2099-10-10T08:00:00.000Z")
    if (action === "replace") assert.equal(rpcInput.p_schedule_starts[0], "2099-10-11T01:00:00.000Z")
  }
})
