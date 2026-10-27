import { notFound } from "next/navigation"
import Link from "next/link"
import { requireTopAdmin } from "@/shared/lib/auth"
import { createAdminClient } from "@/shared/lib/supabase/admin"
import { formatShortDateTime } from "@/shared/lib/utils"
import { operations, logStatuses, errorSummary, type OperationLog } from "@/features/operation-logs/catalog"
import { validId } from "@/features/operation-logs/diagnostics"
import { LogStatusForm } from "@/features/operation-logs/status-form"
import { EventHistory } from "@/features/operation-logs/event-history"
import { getErrorEvents } from "@/features/operation-logs/event-actions"
import { AdminBackLink } from "@/shared/components/admin-back-link"

export const dynamic = "force-dynamic"
export default async function LogDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ status?: string; operation?: string; page?: string }> }) {
  const auth = await requireTopAdmin()
  if (!auth.ok) return <p role="alert">{auth.error}</p>
  const { id } = await params
  if (!validId(id)) notFound()
  const query = await searchParams
  const n = Number(query.page ?? 1)
  const back = "/admin/logs?" + new URLSearchParams({ status: Object.hasOwn(logStatuses, query.status ?? "") ? query.status! : "all", operation: Object.hasOwn(operations, query.operation ?? "") ? query.operation! : "all", page: String(Number.isSafeInteger(n) && n > 0 && n < 10000 ? n : 1) })
  const { data, error } = await createAdminClient().from("operation_error_logs").select("*").eq("id", id).maybeSingle()
  if (error) return <div className="p-4"><AdminBackLink href={back} /><p role="alert">오류 기록을 불러오지 못했습니다. 다시 시도해 주세요.</p></div>
  if (!data) notFound()
  const log = data as OperationLog
  const events = await getErrorEvents(id)
  return <div className="mx-auto w-full max-w-3xl px-4 py-5 md:py-8">
    <AdminBackLink href={back} />
    <h1 className="mb-5 text-xl font-bold">오류 상세</h1>
    <article className="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
      <header className="p-4"><h2 className="font-semibold">{operations[log.operation]}</h2><p className="mt-2 text-sm">{errorSummary(log.operation, log.step)}</p><p className="mt-2 text-sm text-muted-foreground">{logStatuses[log.status]} · {log.occurrences}회 발생</p></header>
          <div className="border-t border-border p-4 text-sm sm:p-5">
            <dl className="grid grid-cols-[5rem_minmax(0,1fr)] gap-x-3 gap-y-2 break-words">
              <dt className="text-muted-foreground">발생 지점</dt><dd>{log.step} · {log.area}</dd>
              <dt className="text-muted-foreground">오류 코드</dt><dd>{log.code}</dd>
              <dt className="text-muted-foreground">처음 발생</dt><dd>{formatShortDateTime(log.first_seen_at)}</dd>
              <dt className="text-muted-foreground">최근 발생</dt><dd>{formatShortDateTime(log.last_seen_at)}</dd>
              <dt className="text-muted-foreground">재발 횟수</dt><dd>{log.recurrences}회</dd>
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{log.operation === "browser" ? "브라우저에서 보낸 확인 전 신고입니다. 새 개별 기록은 같은 회원·화면·오류당 1분에 한 번 집계하며, 이전 기록은 영역별로 제한되었습니다." : "같은 기능·처리 지점·오류 코드를 묶습니다. 사용자 내부 ID와 작업 대상을 기록하되 입력 내용·연락처·인증정보는 저장하지 않습니다."}</p>
            {(log.operation === "sms" || log.step.startsWith("sms")) && <Link href="/admin/sms" className="mt-2 inline-flex min-h-11 items-center text-primary hover:underline">SMS 발송 내역 확인</Link>}
            <LogStatusForm key={`${log.id}-${log.last_seen_at}-${log.status}`} log={log} />
            <EventHistory logId={log.id} initialResult={events} />
          </div>
    </article>
  </div>
}
