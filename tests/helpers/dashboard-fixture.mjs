import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { load } from "./page-review-fixtures.mjs"
const dates = load("src/features/events/lib/date.ts")
const types = load("src/features/events/types.ts")
const filters = load("src/features/applications/lib/admin-list.ts")
const base = {
  "next/link": { default: ({ children, ...props }) => React.createElement("a", props, children) },
  "next/navigation": { useRouter: () => ({ push() {} }) },
  "@/shared/lib/utils": { cn: (...values) => values.filter(Boolean).join(" ") },
}
const brand = load("src/shared/components/brand-icon.tsx", { ...base, "next/image": { default: function FixtureImage(props) { return React.createElement("img", Object.fromEntries(Object.entries(props).filter(([key]) => key !== "unoptimized"))) } } })
const navigation = load("src/features/events/lib/navigation.ts", {
  "./date": dates,
  "@/features/applications/lib/detail-navigation": load("src/features/applications/lib/detail-navigation.ts", { "./admin-list": filters }),
})
const MonthGrid = load("src/features/events/components/month-grid.tsx", {
  ...base, "../types": types, "../lib/date": dates, "../lib/holidays": { getHolidayName: () => null },
  "../lib/navigation": navigation, "./visit-summary": load("src/features/events/components/visit-summary.tsx"),
}).MonthGrid
const MonthNav = load("src/features/events/components/month-nav.tsx", { ...base, "../lib/date": dates }).MonthNav
export const fixtureStats = {
  volunteer: { 접수: 2, 검토중: 1, 일정변경요청: 1, 승인: 384, 반려: 4, 취소: 20, total: 412 },
  adoption: { 접수: 1, 검토중: 0, 일정변경요청: 0, 승인: 61, 반려: 4, 취소: 10, total: 76 },
  monthly: load("src/shared/lib/month-windows.ts").recentMonthWindows(3).map((window, i) => ({ month: window.month, label: window.label, volunteer: [51, 60, 48][i], adoption: [12, 10, 9][i] })),
}
export async function renderDashboard({ params = {}, stats = fixtureStats, fail = false, authorized = true, empty = false } = {}) {
  const day = dates.dateKey(new Date())
  const rows = empty ? [] : [
    { id: "visit-one", source_application_id: "app-one", source_application_type: "volunteer", title: "봉사 – 방문예정자", starts_at: `${day}T10:00:00+09:00`, ends_at: `${day}T12:00:00+09:00`, category: "volunteer", kind: "volunteer", people: 3 },
    { id: "visit-two", source_application_id: "app-two", source_application_type: "adoption", title: "이름이매우긴입양상담신청자확인", starts_at: `${day}T14:00:00+09:00`, ends_at: `${day}T15:00:00+09:00`, category: "adoption_consult", kind: "adoption", people: null },
  ].map(row => ({ ...row, all_day: false, custom_label: null, custom_color: null, visibility: "internal" }))
  const calls = []
  const result = value => fail ? Promise.reject(Error("unavailable")) : Promise.resolve(value)
  const Page = load("src/app/(admin)/admin/(protected)/page.tsx", {
    ...base,
    "@/features/applications/api/dashboard": { getDashboardStats: async () => stats },
    "@/features/applications/api/queries": { getApprovedVolunteerPeople: () => result(1284) },
    "@/features/applications/lib/admin-list": filters,
    "@/features/events": { MonthGrid, MonthNav, listEventsInRange: opts => { calls.push(opts); return result(rows.filter(row => Date.parse(row.starts_at) >= Date.parse(opts.from) && Date.parse(row.starts_at) < Date.parse(opts.to))) } },
    "@/features/events/api/dashboard-visits": { getDashboardVisits: events => result(events) },
    "@/features/events/api/visit-summary": { getVolunteerVisitSummary: () => result({ [day]: { visits: 1, people: 3, unknown: 0 } }) },
    "@/features/events/lib/date": dates, "@/features/events/types": types,
    "@/shared/lib/auth": { requireAdmin: async () => ({ ok: authorized }) },
    "@/shared/components/brand-icon": brand,
    "@/shared/lib/supabase/server": { createClient: async () => ({ rpc: async () => ({ data: [], error: fail ? { message: "unavailable" } : null }) }) },
    "./_components/dashboard-stats": load("src/app/(admin)/admin/(protected)/_components/dashboard-stats.tsx"),
  }).default
  return { html: renderToStaticMarkup(await Page({ searchParams: Promise.resolve(params) })), calls }
}
