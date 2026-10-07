import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import vm from "node:vm"
import ts from "typescript"
import * as jsx from "react/jsx-runtime"

function load(path, imports = {}) {
  const exports = {}
  const code = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  vm.runInNewContext(code, { exports, URLSearchParams, FormData, console, require: name => {
    if (name === "react/jsx-runtime") return jsx
    assert.ok(name in imports, `Missing import: ${name}`)
    return imports[name]
  } })
  return exports
}
const filters = load("src/features/applications/lib/admin-list.ts")
const navigation = load("src/features/applications/lib/detail-navigation.ts", { "./admin-list": filters })
test("application filters default to all-time pending, validate dates, and constrain return paths", () => {
  const initial = filters.parseApplicationFilters({})
  assert.equal(initial.status, "처리 필요")
  assert.equal(initial.from, "")
  assert.equal(initial.sort, "oldest")
  for (const page of ["0", "-2", "Infinity", "2.3", ["2"]]) assert.equal(filters.parseApplicationFilters({ page }).page, 1)
  assert.ok(filters.parseApplicationFilters({ from: "2026-02-29" }).error)
  assert.ok(filters.parseApplicationFilters({ from: "2026-10-09", to: "2026-10-01" }).error)
  assert.ok(filters.parseApplicationFilters({ dateBy: "activity", from: "2026-10-01" }).error)
  assert.ok(filters.parseApplicationFilters({ dateBy: "activity", from: "2025-01-01", to: "2026-10-01" }).error)
  assert.equal(filters.datesInRange("2024-02-28", "2024-03-01").length, 3)
  assert.equal(filters.applicationReturnHref("https://evil.test", "adoption"), "/admin/applications?type=adoption")
  const back = new URL(filters.applicationReturnHref("/admin/applications?type=volunteer&status=승인&page=3&q=홍", "adoption"), "https://example.test")
  assert.equal(back.searchParams.get("type"), "adoption")
  assert.equal(back.searchParams.get("page"), "3")
  assert.equal(back.searchParams.get("q"), "홍")
})

function queryHarness(requestCount = 21, authorized = true, eventError = false) {
  const calls = []
  const request = Array.from({ length: requestCount }, (_, i) => ({ id: `request-${i}` }))
  const rest = Array.from({ length: 40 }, (_, i) => ({ id: `rest-${i}` }))
  const client = { from(table) {
    const steps = []; calls.push({ table, steps })
    const q = { then(resolve) {
      if (table === "events") return resolve({ count: 1200, error: eventError ? "failure" : null })
      if (steps.some(s => s[0] === "select" && s[2]?.head)) return resolve({ count: 10, error: null })
      const set = steps.some(s => s[0] === "eq" && s[2] === "일정변경요청") ? request : rest
      const range = steps.find(s => s[0] === "range")
      resolve({ data: set.slice(range[1], range[2] + 1), count: set.length, error: null })
    } }
    for (const name of ["select", "eq", "neq", "in", "or", "range", "order", "gte", "lte", "overlaps"]) q[name] = (...args) => { steps.push([name, ...args]); return q }
    return q
  } }
  const api = load("src/features/applications/api/admin-queries.ts", {
    "@/shared/lib/auth": { requireAdmin: async () => ({ ok: authorized, error: "denied" }) },
    "@/shared/lib/supabase/server": { createClient: async () => client },
    "../lib/admin-list": filters,
  })
  return { calls, list: api.getAdminApplicationList }
}
test("priority pagination has no skipped or duplicated rows at the request boundary", async () => {
  for (const count of [0, 19, 20, 21, 40]) {
    const api = queryHarness(count)
    const first = await api.list(filters.parseApplicationFilters({}))
    const second = await api.list(filters.parseApplicationFilters({ page: "2" }))
    assert.equal(first.rows.length, 20)
    assert.equal(second.rows.length, 20)
    const ids = [...first.rows, ...second.rows].map(row => row.id)
    assert.equal(new Set(ids).size, 40)
    const expected = [...Array.from({ length: count }, (_, i) => `request-${i}`), ...Array.from({ length: 40 }, (_, i) => `rest-${i}`)].slice(0, 40)
    assert.deepEqual(ids, expected)
    assert.equal(first.total, count + 40)
    assert.equal(first.rows[0].linkedCount, 1200)
  }
})
test("admin list authorizes first; count queries are independent; event failure never means zero", async () => {
  const denied = queryHarness(0, false)
  assert.ok((await denied.list(filters.parseApplicationFilters({}))).error)
  assert.equal(denied.calls.length, 0)
  const api = queryHarness(0, true, true)
  const result = await api.list(filters.parseApplicationFilters({ q: "홍", from: "2026-10-01", to: "2026-10-07", dateBy: "activity" }))
  assert.equal(result.eventsError, true)
  assert.equal(result.rows[0].linkedCount, undefined)
  assert.equal(api.calls.slice(0, 3).some(c => c.steps.some(s => s[0] === "or")), false)
  assert.ok(api.calls.some(c => c.steps.some(s => s[0] === "or" && s[1].includes("reschedule_dates.ov"))))
})

function nodes(element) {
  if (!element || typeof element !== "object") return []
  if (Array.isArray(element)) return element.flatMap(nodes)
  return [element, ...nodes(element.props?.children)]
}
function formHarness(props = {}) {
  const state = [], refs = [], writes = [], errors = []
  let cursor = 0, refCursor = 0
  const api = load("src/features/applications/components/status-form.tsx", {
    react: {
      useState(initial) { const i = cursor++; if (!(i in state)) state[i] = initial; return [state[i], value => { state[i] = typeof value === "function" ? value(state[i]) : value }] },
      useRef(initial) { const i = refCursor++; return refs[i] ??= { current: initial } },
      useTransition() { return [false, async fn => fn()] },
    },
    "next/link": { default: "a" },
    "../api/mutations": { updateVolunteerApplication: async (id, data) => { writes.push({ id, data }); return {} }, updateAdoptionApplication: async (id, data) => { writes.push({ id, data }); return {} } },
    "../api/processing": { approveVolunteerAndContinue: async (id, data, href) => { writes.push({ id, data, next: true, href }); return { redirectTo: "/next" } } },
    "../lib/detail-navigation": navigation,
    "@/shared/components/ui/button": { Button: "button" },
    "@/shared/components/ui/textarea": { Textarea: "textarea" },
    "@/shared/lib/use-save-feedback": { useSaveFeedback: onError => ({ pending: false, completed: false, save: async (action, message, href) => { onError(null); await action(); errors.push({ message, href }) } }) },
    "../lib/admin-list": filters,
  })
  const render = () => { cursor = 0; refCursor = 0; return api.ApplicationStatusForm({ id: "test", kind: "volunteer", currentStatus: "접수", currentNote: null, applicantName: "신청자", hint: { availableDates: ["2026-10-10", "2026-10-11"], availableTime: "10:00" }, returnHref: "/admin/applications?status=접수&page=2", ...props }) }
  const change = (id, value) => nodes(render()).find(n => n.props?.id === id).props.onChange({ target: { value } })
  const choose = (name, index) => nodes(render()).filter(n => n.type === "input" && n.props.name === name)[index].props.onChange()
  const confirm = () => nodes(render()).find(n => n.props?.type === "checkbox").props.onChange({ target: { checked: true } })
  const submit = async () => { const form = nodes(render()).find(n => n.type === "form"); await form.props.onSubmit({ preventDefault() {} }); await Promise.resolve(); await Promise.resolve() }
  return { render, change, choose, confirm, submit, writes, errors, state }
}
test("new volunteer approval is one click, preserves return filters and defaults to schedule creation", async () => {
  const form = formHarness()
  await form.submit()
  assert.equal(form.writes.length, 1)
  assert.equal(form.writes[0].data.get("status"), "승인")
  assert.equal(form.writes[0].data.get("schedule_mode"), "with_schedule")
  assert.match(form.writes[0].data.get("admin_note"), /100L/)
  assert.equal(form.errors[0].href, "/admin/applications?status=접수&page=2")
})
test("approve and continue dispatches only one save and uses server-selected destination", async () => {
  const form = formHarness()
  await nodes(form.render()).find(node => node.props?.children === "승인 후 다음 접수 보기").props.onClick()
  await Promise.resolve(); await Promise.resolve()
  assert.equal(form.writes.length, 1)
  assert.equal(form.writes[0].next, true)
  assert.equal(form.writes[0].data.get("schedule_mode"), "with_schedule")
  assert.equal(form.errors[0].href, undefined)
})
test("reschedule approval replaces schedules; rejection keeps them and does not permit accidental review reset", async () => {
  const props = { currentStatus: "일정변경요청", linkedEventCount: 1, rescheduleInfo: { dates: ["2026-10-20"], time: "11:00" } }
  const accepted = formHarness(props)
  assert.equal(nodes(accepted.render()).some(n => n.type === "select"), false)
  accepted.confirm(); await accepted.submit()
  assert.equal(accepted.writes[0].data.get("status"), "승인")
  assert.equal(accepted.writes[0].data.get("schedule_mode"), "with_schedule")
  const rejected = formHarness(props)
  rejected.choose("decision", 1); await rejected.submit()
  assert.equal(rejected.writes[0].data.get("reject_reschedule"), "true")
  assert.equal(rejected.writes[0].data.get("status"), "승인")
})
test("missing schedule blocks automatic approval; explicit approval-only remains available", async () => {
  const form = formHarness({ hint: { availableDates: [], availableTime: null } })
  await form.submit()
  assert.equal(form.writes.length, 0)
  form.choose("approval-mode", 1); await form.submit()
  assert.equal(form.writes[0].data.get("schedule_mode"), "approval_only")
})
test("notes stay separate per status and cancellation requires a reason", async () => {
  const form = formHarness()
  form.change("application-status", "승인")
  form.change("application-status", "반려")
  assert.equal(nodes(form.render()).find(n => n.props?.id === "application-note").props.value, "")
  await form.submit(); assert.equal(form.writes.length, 0)
  form.change("application-status", "취소")
  await form.submit(); assert.equal(form.writes.length, 0)
  form.change("cancel-reason", "신청자 요청"); await form.submit()
  assert.equal(form.writes[0].data.get("cancel_reason"), "신청자 요청")
})

test("approved application defaults to approval-only and calendar removal requires confirmation", async () => {
  const form = formHarness({ currentStatus: "승인", linkedEventCount: 2 })
  nodes(form.render()).find(n => n.type === "button" && n.props.children === "처리 수정").props.onClick()
  await form.submit()
  assert.equal(form.writes[0].data.get("schedule_mode"), "approval_only")
  form.change("application-status", "검토중")
  await form.submit()
  assert.equal(form.writes.length, 1)
  form.confirm(); await form.submit()
  assert.equal(form.writes[1].data.get("status"), "검토중")
})
