import test from "node:test"
import assert from "node:assert/strict"
import { load } from "./helpers/page-review-fixtures.mjs"
import { renderDashboard, fixtureStats } from "./helpers/dashboard-fixture.mjs"

function database(tables, fail = false) {
  const calls = []
  return { calls, from(table) {
    calls.push(table)
    let rows = tables[table] ?? []
    const q = {
      select() { return q },
      eq(key, value) { rows = rows.filter(row => row[key] === value); return q },
      in(key, values) { rows = rows.filter(row => values.includes(row[key])); return q },
      gte(key, value) { rows = rows.filter(row => row[key] >= value); return q },
      lt(key, value) { rows = rows.filter(row => row[key] < value); return q },
      lte(key, value) { rows = rows.filter(row => row[key] <= value); return q },
      order() { return q }, range() { return q },
      then(resolve) { return Promise.resolve({ data: rows, count: rows.length, error: fail ? { message: "unavailable" } : null }).then(resolve) },
    }
    return q
  } }
}
function api(path, db, authorized = true) {
  return load(path, { "server-only": {}, "@/shared/lib/auth": { requireAdmin: async () => ({ ok: authorized }) }, "@/shared/lib/supabase/server": { createClient: async () => db }, "@/shared/lib/month-windows": load("src/shared/lib/month-windows.ts") })
}
test("dashboard counts include current KST month, exclude future records, and cross year boundaries", async () => {
  const rows = [
    { status: "접수", submitted_at: "2025-12-31T15:00:00.000Z" },
    { status: "검토중", submitted_at: "2026-01-01T00:00:00.000Z" },
    { status: "일정변경요청", submitted_at: "2025-12-31T14:59:59.000Z" },
    { status: "취소", submitted_at: "2026-01-02T00:00:00.000Z" },
  ]
  const data = await api("src/features/applications/api/dashboard.ts", database({ volunteer_applications: rows })).getDashboardStats(new Date("2026-01-01T03:00:00Z"))
  assert.deepEqual(Array.from(data.monthly, row => row.month), ["2025-11", "2025-12", "2026-01"])
  assert.equal(data.monthly[2].volunteer, 2)
  assert.equal(data.monthly[1].volunteer, 1)
  assert.equal(data.volunteer.total, 3)
  assert.equal(data.volunteer.취소, 0)
})
test("dashboard stats reject unauthorized and failed queries instead of returning zero", async () => {
  const db = database({})
  await assert.rejects(api("src/features/applications/api/dashboard.ts", db, false).getDashboardStats(), /권한/)
  assert.equal(db.calls.length, 0)
  await assert.rejects(api("src/features/applications/api/dashboard.ts", database({}, true)).getDashboardStats(), /불러오지/)
})
test("today visits include rescheduling volunteers, exclude cancelled and missing applications, deduplicate and sort", async () => {
  const events = ["approved", "cancelled", "reschedule", "missing"].map((id, i) => ({ id, source_application_id: id, source_application_type: "volunteer", starts_at: `2026-10-27T0${i}:00:00Z` }))
  const db = database({ volunteer_applications: [{ id: "approved", status: "승인", party_size: 3 }, { id: "cancelled", status: "취소", party_size: 9 }, { id: "reschedule", status: "일정변경요청", party_size: 2 }], adoption_applications: [{ id: "adoption", status: "승인" }] })
  const visits = await api("src/features/events/api/dashboard-visits.ts", db).getDashboardVisits([...events, events[0], { id: "adoption", source_application_id: "adoption", source_application_type: "adoption", starts_at: "2026-10-27T01:00:00Z" }])
  assert.deepEqual(Array.from(visits, row => row.id), ["approved", "adoption", "reschedule"])
  assert.equal(visits.reduce((sum, row) => sum + (row.people ?? 0), 0), 5)
  await assert.rejects(api("src/features/events/api/dashboard-visits.ts", database({}, true)).getDashboardVisits(events), /불러오지/)
})
test("dashboard pending links filter reception and review only", async () => {
  const filters = load("src/features/applications/lib/admin-list.ts")
  const db = database({ volunteer_applications: ["접수", "검토중", "일정변경요청", "승인"].map((status, i) => ({ id: String(i), status })) })
  const queries = load("src/features/applications/api/admin-queries.ts", { "@/shared/lib/auth": { requireAdmin: async () => ({ ok: true }) }, "@/shared/lib/supabase/server": { createClient: async () => db }, "../lib/admin-list": filters })
  const result = await queries.getAdminApplicationList(filters.parseApplicationFilters({ status: "승인 대기" }))
  assert.deepEqual(Array.from(result.rows, row => row.status), ["접수", "검토중"])
})
test("dashboard layout keeps shortcuts first, count-only pending, all stats visible, and desktop/mobile alternatives", async () => {
  const { html } = await renderDashboard()
  const labels = ["자주 하는 작업", "처리할 신청", "오늘 방문 예정", "월간 일정", "전체 통계"]
  assert.deepEqual(labels.map(label => html.indexOf(label)).sort((a, b) => a - b), labels.map(label => html.indexOf(label)))
  const pending = html.slice(html.indexOf('<section aria-labelledby="dashboard-pending"'), html.indexOf('<section aria-labelledby="dashboard-today"'))
  assert.equal((pending.match(/dashboard-pending-border/g) ?? []).length, 3)
  assert.doesNotMatch(pending, /방문예정자|입양상담신청자/)
  assert.match(html, /data-dashboard-monthly-table/)
  assert.match(html, /data-dashboard-charts/)
  const stats = html.slice(html.indexOf('<section aria-labelledby="dashboard-statistics"'))
  assert.doesNotMatch(stats, /<details|진행 중|완료된 월/)
  assert.match(stats, /1,284/)
})
test("zero pending has no glow; failures have explicit messages; unauthorized has no data", async () => {
  const zero = { ...fixtureStats, volunteer: { ...fixtureStats.volunteer, 접수: 0, 검토중: 0, 일정변경요청: 0 }, adoption: { ...fixtureStats.adoption, 접수: 0 } }
  assert.doesNotMatch((await renderDashboard({ stats: zero })).html, /dashboard-pending-border/)
  assert.match((await renderDashboard({ empty: true })).html, /오늘 예정된 봉사·입양 상담이 없습니다/)
  const failed = (await renderDashboard({ fail: true, stats: null })).html
  assert.match(failed, /신청 건수를 불러오지/)
  assert.match(failed, /오늘 방문 일정을 불러오지/)
  assert.match(failed, /신청 통계를 불러오지/)
  const denied = await renderDashboard({ authorized: false })
  assert.equal(denied.calls.length, 0)
  assert.doesNotMatch(denied.html, /신청|방문예정자/)
})
test("switching calendar month never switches today visits", async () => {
  const { html, calls } = await renderDashboard({ params: { ym: "2025-01", date: "2025-02-30" } })
  assert.equal(calls.length, 2)
  assert.equal(calls[0].from, "2024-12-31T15:00:00.000Z")
  assert.match(html, /방문예정자/)
  assert.match(html, /2025년 1월/)
})
