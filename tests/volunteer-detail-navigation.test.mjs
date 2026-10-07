import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import vm from "node:vm"
import ts from "typescript"

function load(path, imports = {}) {
  const exports = {}
  const code = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(code, { exports, URLSearchParams, Date, FormData, require: name => { assert.ok(name in imports, name); return imports[name] } })
  return exports
}
const filters = load("src/features/applications/lib/admin-list.ts")
const nav = load("src/features/applications/lib/detail-navigation.ts", { "./admin-list": filters })
const date = load("src/features/events/lib/date.ts")
const calendar = load("src/features/events/lib/navigation.ts", { "@/features/applications/lib/detail-navigation": nav, "./date": date })

test("volunteer detail uses independent desktop columns and retains mobile card order", () => {
  const source = readFileSync("src/app/(admin)/admin/(protected)/applications/volunteer/[id]/page.tsx", "utf8")
  assert.doesNotMatch(source, /xl:row-span|xl:row-start|xl:col-start/)
  assert.match(source, /contents xl:flex xl:min-w-0 xl:flex-\[1\.4\] xl:flex-col xl:gap-4/)
  assert.match(source, /<section className=\{cn\(panel, "order-1"\)\}/)
  assert.match(source, /id="application-processing" className="order-2/)
  assert.match(source, /<details className=\{cn\(panel, "order-3"\)\}/)
  assert.ok(source.indexOf('label="연락처"') < source.indexOf('id="application-processing"'))
  assert.ok(source.indexOf('label="신청 일시"') > source.indexOf('id="application-processing"'))
  assert.match(source, /승인 완료/)
  assert.match(source, /신청은 승인됐지만 캘린더 일정은 없습니다/)
})

test("return navigation is internal and restores calendar month, selected date and category", () => {
  for (const path of ["/", "/calendar", "/admin", "/admin/calendar"]) {
    const href = calendar.calendarReturnHref(path, "2026-10", "2026-10-24", "volunteer,event")
    assert.equal(nav.volunteerReturnHref(href), href)
    const url = new URL(href, "https://example.test")
    assert.equal(url.searchParams.get("ym"), "2026-10")
    assert.equal(url.searchParams.get("date"), "2026-10-24")
    if (path === "/") assert.equal(url.hash, "#volunteer-calendar")
  }
  for (const href of ["https://evil.test", "//evil.test", "javascript:alert(1)", "/admin/calendar/../admins"]) assert.equal(nav.volunteerReturnHref(href), "/admin/applications?type=volunteer")
  assert.equal(nav.volunteerReturnHref("/calendar?ym=2026-13&date=2026-02-30"), "/calendar")
})
test("only staff calendar volunteer sources lead to the unified application detail", () => {
  const event = { id: "event-id", source_application_type: "volunteer", source_application_id: "app-id" }
  const href = calendar.calendarEventHref(event, "/admin/calendar", "/admin?ym=2026-10&date=2026-10-24")
  const query = new URL(href, "https://example.test")
  assert.equal(query.pathname, "/admin/applications/volunteer/app-id")
  assert.equal(query.searchParams.get("event"), "event-id")
  assert.match(query.searchParams.get("returnTo"), /date=2026-10-24/)
  assert.match(calendar.calendarEventHref(event, "/calendar", "/calendar"), /^\/calendar\/event-id\?/)
  assert.match(calendar.calendarEventHref({ ...event, source_application_type: null }, "/admin/calendar", "/admin/calendar"), /^\/admin\/calendar\/event-id\?/)
})
test("single event edit restores the application and cannot use external return destinations", () => {
  const detail = nav.volunteerDetailHref("app-id", "/?ym=2026-10&date=2026-10-24", "event-id")
  assert.equal(nav.eventEditReturnHref(detail, "event-id"), detail)
  assert.equal(nav.eventEditReturnHref("https://evil.test", "event-id"), "/admin/calendar/event-id")
})
test("next pending selection happens after successful approval and preserves original list filters", async () => {
  const calls = []
  const processing = load("src/features/applications/api/processing.ts", {
    "./mutations": { updateVolunteerApplication: async () => { calls.push("saved"); return { id: "current" } } },
    "./admin-queries": { getAdminApplicationList: async params => { calls.push(params); return { rows: [{ id: "already-approved", status: "승인" }, { id: "next", status: "접수" }] } } },
    "../lib/admin-list": filters, "../lib/detail-navigation": nav,
  })
  const result = await processing.approveVolunteerAndContinue("current", new FormData(), "/admin/applications?type=volunteer&q=모임&page=3&sort=latest&status=처리 필요")
  assert.equal(calls[0], "saved")
  assert.equal(calls[1].status, "접수")
  assert.equal(calls[1].page, 1)
  assert.equal(calls[1].q, "모임")
  assert.equal(calls[1].sort, "latest")
  const url = new URL(result.redirectTo, "https://example.test")
  assert.equal(url.pathname, "/admin/applications/volunteer/next")
  assert.equal(new URL(url.searchParams.get("returnTo"), "https://example.test").searchParams.get("page"), "3")
})
test("failed approval never loads next; empty or failed next query safely returns to list", async () => {
  for (const mode of ["save-failed", "empty", "query-failed"]) {
    let queried = false
    const processing = load("src/features/applications/api/processing.ts", {
      "./mutations": { updateVolunteerApplication: async () => mode === "save-failed" ? { error: "failed" } : { id: "current" } },
      "./admin-queries": { getAdminApplicationList: async () => { queried = true; if (mode === "query-failed") throw Error("offline"); return { rows: [] } } },
      "../lib/admin-list": filters, "../lib/detail-navigation": nav,
    })
    const result = await processing.approveVolunteerAndContinue("current", new FormData(), "https://evil.test")
    if (mode === "save-failed") { assert.equal(queried, false); assert.equal(result.error, "failed") }
    else { assert.equal(result.error, undefined); assert.equal(result.redirectTo, "/admin/applications?type=volunteer") }
  }
})

test("homepage calendar actions expose only own applications to members and management links to staff", async () => {
  const events = ["own", "other"].map(id => ({ id: `event-${id}`, source_application_type: "volunteer", source_application_id: id, starts_at: "2026-10-18T04:00:00Z" }))
  for (const role of [null, "member", "staff", "admin"]) {
    const calls = []
    const api = load("src/features/events/api/calendar-links.ts", {
      "@/shared/lib/supabase/server": { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: role ? { id: "user" } : null } }) }, from: () => ({ select() { return this }, eq() { return this }, maybeSingle: async () => ({ data: { role } }) }) }) },
      "@/shared/lib/supabase/admin": {
        createAdminClient: () => ({
          from: table => {
            calls.push(["from", table])
            return {
              select() { return this },
              eq(...args) { calls.push(args); return this },
              in(...args) { calls.push(args); return Promise.resolve({ data: [{ id: "own" }] }) },
            }
          },
        }),
      },
      "../lib/navigation": calendar,
    })
    const links = await api.getCalendarApplicationLinks(events, "/", "2026-10")
    if (!role) { assert.equal(Object.keys(links).length, 0); assert.equal(calls.length, 0) }
    else if (role === "member") {
      assert.equal(Object.keys(links).length, 1)
      assert.equal(links["event-own"].label, "내 신청 보기")
      assert.equal(links["event-own"].wholeRow, undefined)
      assert.equal(links["event-other"], undefined)
      assert.ok(calls.some(call => call[0] === "created_by" && call[1] === "user"))
    } else {
      assert.equal(Object.keys(links).length, 2)
      assert.equal(links["event-other"].label, "봉사 신청 상세 보기")
      assert.equal(links["event-other"].wholeRow, true)
      assert.match(links["event-other"].href, /^\/admin\/applications\/volunteer\/other\?/)
      assert.equal(calls.length, 0)
    }
  }
})
