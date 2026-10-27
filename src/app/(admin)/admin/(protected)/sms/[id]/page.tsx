import { notFound } from "next/navigation"
import Link from "next/link"
import { requireAdmin } from "@/shared/lib/auth"
import { createAdminClient } from "@/shared/lib/supabase/admin"
import { getSmsDeliveryReports } from "@/features/sms"
import { SmsAutoRefresh } from "@/features/sms/auto-refresh"
import { smsStatusPresentation } from "@/features/sms/presentation"
import { formatShortDateTime } from "@/shared/lib/utils"
import { validId } from "@/features/operation-logs/diagnostics"
import { AdminBackLink } from "@/shared/components/admin-back-link"

export const dynamic = "force-dynamic"
export default async function SmsDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return <p role="alert">{auth.error}</p>
  const { id } = await params
  if (!validId(id)) notFound()
  const query = await searchParams
  const n = Number(query.page ?? 1)
  const page = Number.isSafeInteger(n) && n > 0 ? n : 1
  const back = `/admin/sms?page=${page}`
  const { data: row, error } = await createAdminClient().from("sms_delivery_logs").select("*").eq("id", id).maybeSingle()
  if (error) return <div className="p-4"><AdminBackLink href={back} /><p role="alert">발송 기록을 불러오지 못했습니다. 다시 시도해 주세요.</p></div>
  if (!row) notFound()
  const result = await getSmsDeliveryReports(row.provider_message_id ? [row.provider_message_id] : [])
  const report = (result.reports as Record<string, { statusCode?: string; reason?: string }>)[row.provider_message_id]
  const code = report?.statusCode
  const status = smsStatusPresentation(row.state, code)
  return <div className="mx-auto w-full max-w-3xl px-4 py-5 md:py-8">
    <AdminBackLink href={back} />
    <header className="mb-5 flex flex-wrap items-center justify-between gap-3"><h1 className="text-xl font-bold">문자 발송 상세</h1><SmsAutoRefresh /></header>
    {result.error && <p role="alert" className="mb-4 text-sm text-destructive">{result.error}</p>}
    <article className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="p-4"><div className="flex items-center justify-between gap-3"><h2 className="min-w-0 break-words font-semibold">{row.recipient_name || "수신자"}</h2><span className={`shrink-0 rounded-md px-2 py-1 text-xs ${status.className}`}>{status.label}</span></div><dl className="mt-3 grid grid-cols-[5rem_minmax(0,1fr)] gap-2 text-sm"><dt>수신번호</dt><dd className="break-all">{row.recipient_phone}</dd><dt>발송 일시</dt><dd>{formatShortDateTime(row.created_at)}</dd></dl></div>
        <div className="border-t border-border p-4 sm:px-6">
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{row.message}</p>
          {(code || report?.reason || row.error_message) && <p className="mt-3 break-words text-sm text-muted-foreground">{report?.reason || row.error_message}{code ? ` (${code})` : ""}</p>}
          {row.application_id && ["volunteer", "adoption"].includes(row.application_type) && <Link href={`/admin/applications/${row.application_type}/${row.application_id}`} className="mt-2 inline-flex min-h-11 items-center text-sm text-primary hover:underline">관련 신청 보기</Link>}
        </div>
    </article>
  </div>
}
