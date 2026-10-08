import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import vm from "node:vm"
import ts from "typescript"
import { load } from "./helpers/page-review-fixtures.mjs"

test("notification labels and links distinguish application/event/comment types", () => {
  const source = readFileSync("src/shared/components/user-notification-bell.tsx", "utf8") + "\nexports.label = notifLabel; exports.path = notifPath;"
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const exports = {}
  vm.runInNewContext(code, { exports, require: () => ({}) })
  for (const [type, post_type, label, path] of [
    ["application_cancelled", "volunteer", "봉사 신청이 취소", "/my/applications"],
    ["application_cancelled", "adoption", "입양 신청이 취소", "/my/applications"],
    ["event_changed", "event", "일정이 변경", "/calendar/event-id"],
    ["event_canceled", "event", "일정이 취소", "/my/applications"],
    ["event_signup_confirmed", "event", "신청이 접수", "/calendar/event-id"],
    ["event_reminder", "event", "내일", "/calendar/event-id"],
    ["unknown", "unknown", "새 알림", "/my"],
  ]) {
    const notification = { type, post_type, post_id: "event-id" }
    assert.ok(exports.label(notification).includes(label))
    assert.equal(exports.path(notification), path)
  }
  assert.equal(exports.path({ type: "comment_on_post", post_type: "notice", post_id: "1", postPath: "/expenses/1" }), "/expenses/1")
})

test("login return accepts only the application screen, never external or encoded redirects", () => {
  const { loginReturnPath } = load("src/features/members/lib/login-return.ts")
  assert.equal(loginReturnPath("/my/applications"), "/my/applications")
  for (const input of [undefined, "https://example.com", "//example.com", "/\\example.com", "%2F%2Fexample.com", "/admin", ["/my/applications"]]) {
    assert.equal(loginReturnPath(input), "/")
  }
})

function visitFixture(starts, { lookupFails = false, sendFails = false } = {}) {
  const sent = [], notifications = [], pushes = []
  const api = load("src/features/events/volunteer-notice.ts", {
    "server-only": {},
    "@/features/applications/lib/volunteer-sms": load("src/features/applications/lib/volunteer-sms.ts"),
    "@/features/sms": { sendSms: async (...args) => { sent.push(args); return { ok: !sendFails, error: sendFails ? "문자 실패" : undefined } } },
    "@/features/push": { sendPushToUser: async (...args) => pushes.push(args) },
    "@/shared/lib/supabase/admin": { createAdminClient: () => ({ from: table => ({
      select() { return this }, eq() { return this }, order() { return this },
      range: async () => ({ data: starts.map(starts_at => ({ starts_at })), error: lookupFails ? {} : null }),
      insert: async row => { assert.equal(table, "notifications"); notifications.push(row); return { error: null } },
    }) }) },
  })
  const app = { id: "app", applicant_name: "신청자", phone: "01000000000", party_size: 2, created_by: "member", starts: [] }
  return { api, app, sent, notifications, pushes }
}

const first = "2026-10-20T01:00:00.000Z", second = "2026-10-21T01:00:00.000Z"

test("calendar confirmation sends once with all confirmed visits and one in-app notification", async () => {
  const f = visitFixture([first, second])
  assert.equal(await f.api.notifyVolunteerVisitChanges([f.app], true), undefined)
  assert.equal(f.sent.length, 1)
  assert.equal(f.sent[0][2].messageType, "LMS")
  assert.ok(f.sent[0][1].includes("2026.10.20"))
  assert.ok(f.sent[0][1].includes("2026.10.21"))
  assert.equal(f.notifications.length, 1)
  assert.equal(f.pushes.length, 1)
})

test("unchanged visit means no SMS or notifications for metadata-only/repeated saves", async () => {
  const f = visitFixture([first])
  await f.api.notifyVolunteerVisitChanges([{ ...f.app, starts: [first] }], true)
  assert.equal(f.sent.length + f.notifications.length + f.pushes.length, 0)
})

test("partial calendar cancellation sends remaining dates, not entire visit cancellation", async () => {
  const f = visitFixture([second])
  await f.api.notifyVolunteerVisitChanges([{ ...f.app, starts: [first, second] }])
  assert.equal(f.sent.length, 1)
  assert.equal(f.sent[0][2].messageType, "LMS")
  assert.ok(f.sent[0][1].includes("변경이 확정"))
  assert.ok(!f.sent[0][1].includes("2026.10.20"))
  assert.equal(f.notifications.length + f.pushes.length, 0)
})

test("last visit removal is one SMS; send failure produces warning without retry", async () => {
  const f = visitFixture([], { sendFails: true })
  assert.match(await f.api.notifyVolunteerVisitChanges([{ ...f.app, starts: [first] }]), /일정은 저장/)
  assert.equal(f.sent.length, 1)
  assert.equal(f.sent[0][2].messageType, "SMS")
  assert.match(f.sent[0][1], /취소/)
})

test("failed schedule lookup never sends a speculative SMS", async () => {
  const f = visitFixture([], { lookupFails: true })
  assert.ok(await f.api.notifyVolunteerVisitChanges([f.app]))
  assert.equal(f.sent.length, 0)
})
