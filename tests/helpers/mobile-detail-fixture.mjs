import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { load } from "./page-review-fixtures.mjs"

export const recordId = "00000000-0000-4000-8000-000000000001"
export async function renderLogScreen(kind, { detail = false, authorized = true, missing = false, failed = false, params = {} } = {}) {
  let reads = 0
  const sms = { id: recordId, recipient_name: "긴이름의수신자확인", recipient_phone: "010-0000-1234", state: "failed", message: "문자 본문 예시", error_message: "수신 번호 확인 필요", application_type: "volunteer", application_id: recordId, created_at: "2026-10-27T00:30:00Z" }
  const log = { id: recordId, operation: "upload", step: "adoptionDocumentUpload", code: "STORAGE_TIMEOUT", area: "upload", status: "open", occurrences: 2, recurrences: 0, first_seen_at: "2026-10-27T00:30:00Z", last_seen_at: "2026-10-27T00:30:00Z" }
  const row = kind === "sms" ? sms : log
  const db = { from() {
    reads++
    const q = { select() { return q }, eq() { return q }, gte() { return q }, order() { return q }, range() { return q }, maybeSingle: async () => ({ data: missing ? null : row, error: failed ? {} : null }), then(resolve) { resolve({ data: [row], count: 1, error: failed ? {} : null }) } }
    return q
  } }
  const imports = {
    "next/link": { default: ({ children, ...props }) => React.createElement("a", props, children) },
    "next/navigation": { notFound() { throw Error("NOT_FOUND") } },
    "@/shared/lib/auth": { requireAdmin: async () => ({ ok: authorized, error: "권한 없음" }), requireTopAdmin: async () => ({ ok: authorized, error: "권한 없음" }) },
    "@/shared/lib/supabase/admin": { createAdminClient: () => db },
    "@/shared/lib/utils": { formatShortDateTime: () => "26.10.27 09:30" },
    "@/features/sms": { getSmsDeliveryReports: async () => ({ reports: {} }) },
    "@/features/sms/presentation": load("src/features/sms/presentation.ts"),
    "@/features/sms/auto-refresh": { SmsAutoRefresh: () => React.createElement("span", null, "상태 자동 갱신") },
    "@/features/operation-logs/catalog": load("src/features/operation-logs/catalog.ts"),
    "@/features/operation-logs/diagnostics": { validId: value => /^[0-9a-f-]{36}$/.test(value), pageLabel: () => "입양 상담 상세", targetHref: () => null },
    "@/features/operation-logs/status-form": { LogStatusForm: () => React.createElement("button", null, "상태 저장") },
    "@/features/operation-logs/event-actions": { getErrorEvents: async () => ({ events: [{ id: recordId, occurred_at: log.last_seen_at, actor_role: "staff", page: "/admin/applications/adoption/detail", description: "첨부 처리 실패", device: "mobile", browser: "Safari", source: "server", trace_id: "example-trace" }], hasMore: false }) },
  }
  imports["@/shared/components/admin-back-link"] = load("src/shared/components/admin-back-link.tsx", imports)
  imports["@/features/operation-logs/event-history"] = load("src/features/operation-logs/event-history.tsx", { "next/link": imports["next/link"], "./event-actions": imports["@/features/operation-logs/event-actions"], "./diagnostics": imports["@/features/operation-logs/diagnostics"], "@/shared/lib/utils": imports["@/shared/lib/utils"] })
  const Page = load(`src/app/(admin)/admin/(protected)/${kind}/${detail ? "[id]/" : ""}page.tsx`, imports).default
  const html = renderToStaticMarkup(await Page({ params: Promise.resolve({ id: params.id ?? recordId }), searchParams: Promise.resolve(params) }))
  return { html, reads }
}
