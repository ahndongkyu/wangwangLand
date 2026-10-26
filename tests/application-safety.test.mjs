import { operatingFixture } from "./helpers/operating-fixture.mjs"
import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import vm from "node:vm"
import ts from "typescript"
import sanitizeHtml from "sanitize-html"

function load(file, imports = {}) {
  const exports = {}
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(code, { exports, Date, FormData, console: { error() {} }, require(name) {
    if (operatingFixture(name) && !(name in imports)) return operatingFixture(name)
    if (name === "../lib/volunteer-sms") return load("src/features/applications/lib/volunteer-sms.ts")
    if (name === "@/shared/lib/sanitize-rich-text") return load("src/shared/lib/sanitize-rich-text.ts", { "sanitize-html": { default: sanitizeHtml } })
    if (name === "@/features/operation-logs/server") return { recordOperationError: async () => {} }
    assert.ok(name in imports, `Unexpected dependency: ${name}`)
    return imports[name]
  } })
  return exports
}

const hours = load("src/features/applications/lib/volunteer-operating-hours.ts")

test("stale approval, rejection, cancellation and missing revisions cannot mutate or send messages", async () => {
  for (const status of ["승인", "반려", "취소"]) for (const scenario of ["changed-status", "changed-note", "missing", "race", "fresh"]) {
    let calls = 0
    const latestStatus = scenario === "changed-status" ? "승인" : "접수"
    const latestRevision = scenario === "changed-note" ? "new-version" : "old-version"
    const admin = {
      from(table) {
        assert.ok(["volunteer_applications", "events"].includes(table), "No SMS or notification writes expected")
        return { select() { return this }, eq() { return this },
          maybeSingle: async () => ({ data: { id: "app", status: latestStatus, updated_at: latestRevision, created_by: null, phone: null } }),
          then(resolve) { resolve({ count: 0, error: null }) },
        }
      },
      rpc: async (name, input) => {
        calls++
        assert.equal(name, "process_volunteer_application_checked")
        assert.equal(input.p_expected_updated_at, "old-version")
        return scenario === "race" ? { error: { message: "처리 중 신청 상태나 내용이 변경되었습니다. 신청 내역을 새로 확인해주세요." } } : { data: 0, error: null }
      },
    }
    const api = load("src/features/applications/api/mutations.ts", {
      "next/cache": { revalidatePath() {} }, "next/navigation": {},
      "@/shared/lib/auth": { requireAdmin: async () => ({ ok: true, userId: "staff" }) },
      "@/shared/lib/supabase/server": {}, "@/shared/lib/supabase/admin": { createAdminClient: () => admin },
      "@/features/events/lib/date": {}, "@/features/events/types": {}, "../lib/volunteer-applicant": {},
      "../lib/volunteer-operating-hours": hours, "@/shared/lib/validation": {},
    })
    const form = new FormData()
    form.set("status", status); form.set("admin_note", "반려 사유"); form.set("cancel_reason", "취소 사유")
    if (scenario !== "missing") { form.set("expected_status", "접수"); form.set("expected_updated_at", "old-version") }
    const result = await api.updateVolunteerApplication("app", form)
    assert.equal(!!result.conflict, scenario !== "fresh", `${status}/${scenario}`)
    assert.equal(calls, ["race", "fresh"].includes(scenario) ? 1 : 0)
  }
})
test("approval sends selected SMS or records skipped without preventing approval", async () => {
  for (const mode of ["short", "full", "none", "invalid"]) {
    const sends = [], logs = []
    let approvals = 0
    const admin = {
      from(table) {
        if (table === "sms_delivery_logs") return { insert: async row => { logs.push(row); return {} } }
        return { select() { return this }, eq() { return this }, maybeSingle: async () => ({ data: { id: "app", status: "접수", updated_at: "2026-10-08T00:00:00+00:00", created_by: null, applicant_name: "홍길동", phone: "010-0000-0000", available_dates: ["2099-10-10"], available_time: "10:00" } }) }
      },
      rpc: async () => { approvals++; return { data: 1, error: null } },
    }
    const api = load("src/features/applications/api/mutations.ts", {
      "next/cache": { revalidatePath() {} }, "next/navigation": {},
      "@/shared/lib/auth": { requireAdmin: async () => ({ ok: true, userId: "staff" }) },
      "@/shared/lib/supabase/server": {}, "@/shared/lib/supabase/admin": { createAdminClient: () => admin },
      "@/features/events/lib/date": load("src/features/events/lib/date.ts"), "@/features/events/types": {},
      "../lib/volunteer-applicant": { formatVolunteerApplicantName: name => name },
      "../lib/volunteer-operating-hours": hours, "@/shared/lib/validation": {},
      "@/features/sms": { sendSms: async (...args) => { sends.push(args); return { ok: true } } },
    })
    const form = new FormData()
    form.set("status", "승인"); form.set("schedule_mode", "with_schedule"); form.set("sms_mode", mode)
    form.set("expected_status", "접수"); form.set("expected_updated_at", "2026-10-08T00:00:00+00:00")
    const result = await api.updateVolunteerApplication("app", form)
    assert.equal(approvals, mode === "invalid" ? 0 : 1)
    if (mode === "invalid") { assert.ok(result.error); continue }
    assert.equal(result.warning, undefined)
    assert.equal(sends.length, mode === "none" ? 0 : 1)
    assert.equal(logs.length, mode === "none" ? 1 : 0)
    if (mode === "none") assert.equal(logs[0].state, "skipped")
    else assert.equal(sends[0][2].messageType, mode === "short" ? "SMS" : "LMS")
  }
})
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

test("past dates fail while today/future dates retain strict 16:00 cutoff", () => {
  const now = new Date("2026-10-01T15:00:00Z")
  for (const dates of [["2026-10-01"], ["2026-10-01", "2026-10-03"]]) assert.match(hours.validateVolunteerSchedule(dates, "10:00", now), /지난 날짜/)
  for (const date of ["2026-10-02", "2026-10-03"]) {
    for (const time of ["10:00", "10:30", "11:00", "13:00", "16:00"]) assert.equal(hours.validateVolunteerSchedule([date], time, now), null)
    for (const time of ["09:50", "11:10", "12:00", "17:10", "17:50"]) assert.ok(hours.validateVolunteerSchedule([date], time, now))
  }
  for (const date of ["2026-02-30", "2026-13-01", "invalid"]) assert.ok(hours.validateVolunteerSchedule([date], "10:00", now))
  assert.equal(hours.getVolunteerTimeOptions(["2020-01-01"], now).length, 0, "Past dates have no selectable visit times")
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
    form.set("expected_status", previousStatus); form.set("expected_updated_at", "2026-10-08T00:00:00+00:00")
    assert.equal((await api.updateVolunteerApplication("app", form)).id, "app")
    assert.equal(rpcInput.p_schedule_action, action)
    assert.equal(rpcInput.p_schedule_starts.length, action === "keep" ? 0 : 1)
    if (action === "append") assert.equal(rpcInput.p_schedule_starts[0], "2099-10-10T08:00:00.000Z")
    if (action === "replace") assert.equal(rpcInput.p_schedule_starts[0], "2099-10-11T01:00:00.000Z")
  }
})
