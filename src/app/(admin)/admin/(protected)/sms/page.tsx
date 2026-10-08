import type { Metadata } from "next"
import Link from "next/link"
import { requireAdmin } from "@/shared/lib/auth"
import { createAdminClient } from "@/shared/lib/supabase/admin"
import { getSmsDeliveryReports } from "@/features/sms"
import { SmsAutoRefresh } from "@/features/sms/auto-refresh"
import { SmsDiagnosticPanel } from "@/features/sms/diagnostic-panel"
import { formatPostDateTime } from "@/shared/lib/utils"

export const metadata: Metadata = { title: "SMS 발송 내역" }
export const dynamic = "force-dynamic"

export default async function SmsHistoryPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return <p role="alert">{auth.error}</p>
  const params = await searchParams
  const rawPage = Number(params.page ?? 1)
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1
  const { data, error, count } = await createAdminClient().from("sms_delivery_logs")
    .select("*", { count: "exact" }).order("created_at", { ascending: false }).order("id", { ascending: false })
    .range((page - 1) * 20, page * 20 - 1)
  const logs = data ?? []
  const result = error ? { reports: {}, error: "발송 기록을 불러오지 못했습니다. DB 설정을 확인한 뒤 다시 시도해주세요." }
    : await getSmsDeliveryReports(logs.flatMap(row => row.provider_message_id ? [row.provider_message_id] : []))
  const reports = result.reports as Record<string, { statusCode?: string; reason?: string }>
  const labels: Record<string, string> = { pending: "요청 처리 중 · 결과 미확인", accepted: "접수 완료 · 전달 결과 미확인", failed: "발송 실패", unknown: "결과 확인 필요" }
  return <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-2xl font-bold md:text-3xl">SMS 발송 내역</h1>
        <p className="mt-2 text-sm text-muted-foreground">홈페이지에서 보낸 문자와 전달 결과를 확인하세요. 이 기능 적용 이후 요청부터 기록됩니다.</p>
        <p className="mt-1 text-sm text-muted-foreground">접수와 전달 완료는 다릅니다. 결과 미확인 상태에서는 중복 발송에 주의하세요.</p>
      </div>
      <SmsAutoRefresh />
    </header>
    {result.error && <p role="alert" className="mb-4 rounded-xl border border-destructive/30 bg-card p-4 text-sm text-destructive">{result.error}</p>}
    {!error && logs.length === 0 && <p className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">기록된 문자 발송 내역이 없습니다.</p>}
    <div className="@container">
    {logs.length > 0 && <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div aria-hidden="true" className="hidden grid-cols-[minmax(0,1fr)_8rem_9rem_8rem_3.5rem] gap-3 border-b border-border bg-muted/50 px-4 py-3 text-xs text-muted-foreground @min-[640px]:grid">
        <span>수신자</span><span>전화번호</span><span>발송 일시</span><span>발송 상태</span><span className="text-right">펼치기</span>
      </div>
      {logs.map(row => {
      const report = reports[row.provider_message_id]
      const code = report?.statusCode
      const status = code === "4000" ? "전달 완료" : code === "2000" || code === "3000" ? "발송 진행 중" : code ? `제공업체 결과 ${code}` : labels[row.state] ?? "결과 확인 필요"
      return <details key={row.id} name="sms-history" className="group border-b border-border last:border-b-0">
        <summary className="grid min-h-16 cursor-pointer list-none grid-cols-[minmax(0,1fr)_minmax(0,8rem)] items-center gap-x-3 gap-y-1 px-4 py-3 text-sm transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring group-open:bg-muted/50 [&::-webkit-details-marker]:hidden @min-[640px]:grid-cols-[minmax(0,1fr)_8rem_9rem_8rem_3.5rem] @min-[640px]:gap-y-0">
          <span className="col-start-1 row-start-1 min-w-0 break-words font-medium @min-[640px]:col-auto @min-[640px]:row-auto"><span className="sr-only">수신자 </span>{row.recipient_name || "수신자"}</span>
          <span className="col-start-1 row-start-2 min-w-0 break-all text-xs tabular-nums text-muted-foreground @min-[640px]:col-auto @min-[640px]:row-auto"><span className="sr-only">전화번호 </span>{row.recipient_phone}</span>
          <span className="col-start-1 row-start-3 text-xs tabular-nums text-muted-foreground @min-[640px]:col-auto @min-[640px]:row-auto"><span className="sr-only">발송 일시 </span><time dateTime={row.created_at}>{formatPostDateTime(row.created_at)}</time></span>
          <span className="col-start-2 row-start-1 min-w-0 break-words text-right text-xs font-medium @min-[640px]:col-auto @min-[640px]:row-auto @min-[640px]:text-left"><span className="sr-only">발송 상태 </span>{status}</span>
          <span className="col-start-2 row-span-2 row-start-2 text-right text-xs text-primary @min-[640px]:col-auto @min-[640px]:row-span-1 @min-[640px]:row-auto"><span className="group-open:hidden">펼치기</span><span className="hidden group-open:inline">접기</span></span>
        </summary>
        <div className="border-t border-border p-4 sm:px-6">
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{row.message}</p>
          {(report?.reason || row.error_message) && <p className="mt-3 break-words text-sm text-muted-foreground">{report?.reason || row.error_message}{code ? ` (${code})` : ""}</p>}
          {row.application_id && ["volunteer", "adoption"].includes(row.application_type) && <Link href={`/admin/applications/${row.application_type}/${row.application_id}`} className="mt-2 inline-flex min-h-11 items-center text-sm text-primary hover:underline">관련 신청 보기</Link>}
        </div>
      </details>
    })}</div>}
    </div>
    <nav aria-label="발송 내역 페이지" className="mt-6 flex items-center justify-center gap-6 text-sm">
      {page > 1 && <Link className="inline-flex min-h-11 items-center hover:underline" href={`/admin/sms?page=${page - 1}`}>이전</Link>}
      <span>{page} / {Math.max(1, Math.ceil((count ?? 0) / 20))}</span>
      {page * 20 < (count ?? 0) && <Link className="inline-flex min-h-11 items-center hover:underline" href={`/admin/sms?page=${page + 1}`}>다음</Link>}
    </nav>
    {auth.role === "admin" && <SmsDiagnosticPanel />}
  </div>
}
