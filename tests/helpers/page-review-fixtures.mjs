import { readFileSync } from "node:fs"
import vm from "node:vm"
import ts from "typescript"
import React from "react"
import * as jsx from "react/jsx-runtime"
import { renderToStaticMarkup } from "react-dom/server"
import * as icons from "lucide-react"

export function load(path, imports = {}) {
  const exports = {}
  const code = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  vm.runInNewContext(code, { exports, Date, URL, URLSearchParams, FormData, process: { env: {} }, require: name => {
    if (name === "react") return React
    if (name === "react/jsx-runtime") return jsx
    if (name === "lucide-react") return icons
    if (!(name in imports)) throw Error(`Missing fixture import: ${name}`)
    return imports[name]
  } })
  return exports
}
const element = (tag, text) => () => React.createElement(tag, null, text)
const Link = ({ children, ...props }) => React.createElement("a", props, children)
const Image = ({ fill, sizes, ...props }) => React.createElement("img", { ...props, width: 40, height: 40 })
const site = load("src/shared/constants/site.ts").SITE
const base = {
  "next/link": { default: Link }, "next/image": { default: Image },
  "next/navigation": { notFound: () => { throw Error("Not found") }, redirect: href => { throw Error(`Redirect ${href}`) } },
  "@/shared/lib/utils": { cn: (...args) => args.filter(Boolean).join(" "), formatShortDate: iso => iso.slice(2, 10).replaceAll("-", ".") },
  "@/shared/constants/site": { SITE: site },
  "@/shared/lib/validation": { formatKoreanPhone: value => value },
  "@/shared/components/search-box": { SearchBox: ({ placeholder }) => React.createElement("input", { placeholder, className: "h-11 w-full min-w-0 rounded-lg border border-border px-3" }) },
  "@/shared/components/admin-filter-bar": { AdminFilterBar: () => React.createElement("select", { className: "min-h-11 rounded-lg border border-border bg-card px-3" }, React.createElement("option", null, "모든 상태")) },
  "@/shared/components/pagination": { Pagination: element("nav", "1 / 2 페이지") },
  "@/shared/components/empty-state": { EmptyState: ({ title }) => React.createElement("p", null, title) },
  "@/shared/components/copy-button": { CopyButton: ({ label }) => React.createElement("button", { className: "min-h-11 rounded-lg border border-border px-3" }, `${label} 복사`) },
  "@/shared/components/brand-icon": { BrandIcon: () => null },
  "@/shared/components/ui/button": { buttonVariants: () => "inline-flex min-h-11 items-center rounded-lg border border-border px-4" },
}
export const profiles = [
  { id: "member-one", nickname: "긴닉네임도끝까지확인가능한회원", role: "member", status: "approved", phone: "010-0000-0000", created_at: "2026-10-07", avatar_url: null, is_banned: false },
  { id: "member-two", nickname: "가입중인회원", role: "member", status: "pending", phone: null, created_at: "2026-10-06", avatar_url: null, is_banned: false },
  { id: "member-three", nickname: "차단회원", role: "staff", status: "approved", phone: "010-0000-0000", created_at: "2026-09-06", avatar_url: null, is_banned: true },
]
const DonationStatusBadge = ({ status }) => React.createElement("span", { className: "rounded-md bg-muted px-2 py-1 text-xs" }, ({ approved: "기록완료", pending: "검토중", rejected: "반려" })[status])
const donations = { listDonations: async () => ({ donations: [{ id: "cash", donor_name: "후원단체명이길어질경우확인하는예시", type: "cash", amount: 30000, status: "pending", donated_at: "2026-10-07" }, { id: "goods", donor_name: "물품후원자", type: "goods", item_description: "사료와담요등긴물품이름", item_quantity: "3박스", status: "approved", donated_at: "2026-10-06" }], total: 22 }), getDonationStats: async () => ({ approvedCashTotal: 123456789, approvedGoodsCount: 12, approvedCount: 40, pendingCount: 3 }), DonationStatusBadge, listRecentApprovedDonations: async () => [], DonationTicker: () => null }
export async function renderMembers(params = {}) {
  const Table = load("src/features/members/components/admin-members-table.tsx", base).AdminMembersTable
  const Page = load("src/app/(admin)/admin/(protected)/members/page.tsx", { ...base, "@/features/members": { listProfiles: async () => ({ profiles, total: 22, pendingCount: 4, approvedCount: 28, rejectedCount: 2 }), AdminMembersTable: Table }, "@/features/auth": { getCurrentAdmin: async () => ({ role: "admin" }) } }).default
  return renderToStaticMarkup(await Page({ searchParams: Promise.resolve(params) }))
}
export async function renderDonations(params = {}) {
  const Page = load("src/app/(admin)/admin/(protected)/donations/page.tsx", { ...base, "@/features/donations": donations }).default
  return renderToStaticMarkup(await Page({ searchParams: Promise.resolve(params) }))
}
export async function renderDonate() {
  return renderToStaticMarkup(await load("src/app/(public)/donate/page.tsx", { ...base, "@/features/donations": donations }).default())
}
export function renderContact() { return renderToStaticMarkup(React.createElement(load("src/app/(public)/contact/page.tsx", base).default)) }
const filters = load("src/features/applications/lib/admin-list.ts")
export async function renderAdoption() {
  const Badge = load("src/features/applications/components/application-detail-layout.tsx").ApplicationBadge
  const Status = load("src/features/applications/components/status-form.tsx", {
    ...base, "../api/mutations": {}, "../api/processing": {}, "../lib/detail-navigation": load("src/features/applications/lib/detail-navigation.ts", { "./admin-list": filters }), "../lib/admin-list": filters,
    "@/shared/components/ui/button": { Button: ({ children, variant, size, ...props }) => React.createElement("button", props, children) },
    "@/shared/components/ui/textarea": { Textarea: props => React.createElement("textarea", props) },
    "@/shared/lib/use-save-feedback": { useSaveFeedback: () => ({ pending: false, completed: false, save: async () => {} }) },
  }).ApplicationStatusForm
  const Page = load("src/app/(admin)/admin/(protected)/applications/adoption/[id]/page.tsx", {
    ...base, "@/features/applications/components/application-detail-layout": { ApplicationBadge: Badge }, "@/features/applications/lib/admin-list": filters,
    "@/features/applications": { ApplicationStatusForm: Status, getAdoptionApplication: async () => ({ id: "adoption", applicant_name: "입양신청자", status: "접수", phone: "010-0000-0000", submitted_at: "2026-10-07T01:20:00Z", created_by: "member", dog: { id: "dog", name: "사랑" }, address: "인천시", family_size: 3, housing_type: "아파트", ownership_type: "자가", current_pets: "없음", past_pet_experience: "반려동물과 함께한 경험", visit_available_dates: ["2026-10-18"], visit_available_time: "13:00", reason: "오랫동안 함께할 가족을 찾고 있습니다. 충분히 고민하고 신청했습니다." }) },
  }).default
  return renderToStaticMarkup(await Page({ params: Promise.resolve({ id: "adoption" }), searchParams: Promise.resolve({}) }))
}
export async function renderMyApplications({ eventError = false } = {}) {
  const calls = []
  const volunteer = { id: "own", status: "일정변경요청", submitted_at: "2026-10-07T01:20:00Z", available_dates: ["2026-10-18"], available_days: [], available_time: "10:00", party_size: 2, reschedule_dates: ["2026-10-24"], reschedule_time: "15:00", admin_note: "헌옷과 목장갑을 준비해주세요.", cancel_reason: null }
  const admin = { from: table => {
    const query = { select() { return this }, eq(key, value) { calls.push([table, key, value]); return this }, in(key, value) { calls.push([table, key, value]); return this }, order() { return this }, then(resolve) { return Promise.resolve({ data: table === "volunteer_applications" ? [volunteer] : table === "events" && !eventError ? [{ source_application_id: "own", starts_at: "2026-10-19T06:00:00Z" }] : [], error: table === "events" && eventError ? { message: "offline" } : null }).then(resolve) } }
    return query
  } }
  const Page = load("src/app/(public)/my/applications/page.tsx", {
    ...base, "@/features/applications/lib/admin-list": filters, "@/features/applications/lib/volunteer-operating-hours": { volunteerToday: () => "2026-10-07" },
    "./cancel-button": { CancelMyApplicationButton: element("button", "신청 취소") }, "@/shared/lib/supabase/server": { createClient: async () => ({ auth: { getSession: async () => ({ data: { session: { user: { id: "member" } } } }) } }) },
    "@/shared/lib/supabase/admin": { createAdminClient: () => admin }, "@/shared/components/ui/badge": { Badge: ({ children, ...props }) => React.createElement("span", props, children) },
    "@/features/staff-schedule": { listStaffOnDates: async () => ({}), StaffAvailabilityDisplay: element("p", "출근 예정 확인 중") },
  }).default
  return { html: renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ application: "own" }) })), calls }
}
