import type { Metadata } from "next"
import Link from "next/link"
import { requireTopAdmin } from "@/shared/lib/auth"
import { createAdminClient } from "@/shared/lib/supabase/admin"
import { formatShortDateTime } from "@/shared/lib/utils"
import { operations, logStatuses, errorSummary, type OperationLog } from "@/features/operation-logs/catalog"
import { LogStatusForm } from "@/features/operation-logs/status-form"

export const metadata: Metadata = { title: "오류 로그" }
export const dynamic = "force-dynamic"
const stateColors = {
  open: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  investigating: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  resolved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
}

export default async function OperationLogsPage({ searchParams }: { searchParams: Promise<{ status?: string; operation?: string; page?: string }> }) {
  const auth = await requireTopAdmin()
  if (!auth.ok) return <p role="alert" className="p-6">{auth.error}</p>
  const params = await searchParams
  const status = Object.hasOwn(logStatuses, params.status ?? "") ? params.status! : "all"
  const operation = Object.hasOwn(operations, params.operation ?? "") ? params.operation! : "all"
  const rawPage = Number(params.page ?? 1)
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 && rawPage < 10000 ? rawPage : 1
  let logs: OperationLog[] = []
  let count = 0
  let failed = false
  try {
    let query = createAdminClient().from("operation_error_logs").select("*", { count: "exact" })
      .gte("last_seen_at", new Date(Date.now() - 90 * 86400000).toISOString())
    if (status !== "all") query = query.eq("status", status)
    if (operation !== "all") query = query.eq("operation", operation)
    const result = await query.order("last_seen_at", { ascending: false }).order("id", { ascending: false }).range((page - 1) * 20, page * 20 - 1)
    failed = !!result.error
    logs = (result.data ?? []) as OperationLog[]
    count = result.count ?? 0
  } catch { failed = true }
  const href = (n: number) => `/admin/logs?${new URLSearchParams({ status, operation, page: String(n) })}`
  return <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
    <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-2xl font-bold md:text-3xl">오류 로그</h1>
        <p className="mt-2 text-sm text-muted-foreground">실패한 기능을 확인하고 처리 상태를 관리하세요. 정상 이용·페이지 조회는 기록하지 않습니다.</p>
        <p className="mt-1 text-xs text-muted-foreground">최근 90일 내 발생한 오류 묶음 · 적용 이후 수집 · 최상위 관리자 전용</p>
      </div>
      <Link href={href(page)} className="inline-flex min-h-11 items-center rounded-lg border border-border bg-card px-4 text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">새로고침</Link>
    </header>
    <form className="mb-4 flex flex-wrap items-end gap-3">
      <label className="flex min-w-32 flex-1 flex-col gap-1 text-xs text-muted-foreground sm:flex-none">상태
        <select name="status" defaultValue={status} className="min-h-11 rounded-lg border border-border bg-card px-3 text-sm text-foreground">
          <option value="all">전체 상태</option>{Object.entries(logStatuses).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
        </select>
      </label>
      <label className="flex min-w-40 flex-1 flex-col gap-1 text-xs text-muted-foreground sm:flex-none">기능
        <select name="operation" defaultValue={operation} className="min-h-11 rounded-lg border border-border bg-card px-3 text-sm text-foreground">
          <option value="all">전체 기능</option>{Object.entries(operations).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
        </select>
      </label>
      <button className="min-h-11 rounded-lg border border-border bg-card px-4 text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">조회</button>
      <span className="py-3 text-xs text-muted-foreground">{failed ? "조회 실패" : `${count}개 오류 묶음`}</span>
    </form>
    {failed ? <p role="alert" className="rounded-xl border border-destructive/30 bg-card p-5 text-sm text-destructive">오류 기록을 불러오지 못했습니다. 오류 로그 SQL 적용 여부와 DB 연결을 확인해주세요. 기록이 없는 상태와는 다릅니다.</p>
      : logs.length === 0 ? <p className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">조건에 맞는 오류 기록이 없습니다. 모든 기능의 정상 동작을 보장하는 의미는 아닙니다.</p>
      : <div className="@container overflow-hidden rounded-xl border border-border bg-card">
        <div aria-hidden="true" className="hidden grid-cols-[9rem_minmax(0,1fr)_4rem_6rem_3.5rem] items-center gap-3 border-b border-border bg-muted/50 px-4 py-3 text-xs text-muted-foreground @min-[680px]:grid">
          <span className="text-center">최근 발생</span><span>기능 · 오류</span><span className="text-center">누적</span><span className="text-center">상태</span><span className="text-right">펼치기</span>
        </div>
        {logs.map(log => <details key={log.id} name="operation-logs" className="group border-b border-border last:border-b-0">
          <summary className="grid min-h-16 cursor-pointer list-none grid-cols-[minmax(0,1fr)_6rem] items-center gap-3 px-4 py-3 text-sm hover:bg-muted/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring group-open:bg-muted/50 [&::-webkit-details-marker]:hidden @min-[680px]:grid-cols-[9rem_minmax(0,1fr)_4rem_6rem_3.5rem]">
            <time dateTime={log.last_seen_at} className="col-start-1 row-start-2 text-xs tabular-nums text-muted-foreground @min-[680px]:col-auto @min-[680px]:row-auto @min-[680px]:text-center">{formatShortDateTime(log.last_seen_at)}</time>
            <span className="col-start-1 row-start-1 min-w-0 @min-[680px]:col-auto @min-[680px]:row-auto"><span className="font-medium">{operations[log.operation]}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{errorSummary(log.operation, log.step)} · {log.code}</span></span>
            <span className="col-start-1 row-start-3 text-xs tabular-nums text-muted-foreground @min-[680px]:col-auto @min-[680px]:row-auto @min-[680px]:text-center">{log.occurrences}회{log.recurrences > 0 && <span className="ml-1 text-destructive">재발</span>}</span>
            <span className={`col-start-2 row-start-1 justify-self-end rounded-md px-2 py-1 text-xs font-medium @min-[680px]:col-auto @min-[680px]:row-auto @min-[680px]:justify-self-center ${stateColors[log.status]}`}>{logStatuses[log.status]}</span>
            <span className="col-start-2 row-start-2 text-right text-xs text-primary @min-[680px]:col-auto @min-[680px]:row-auto"><span className="group-open:hidden">펼치기</span><span className="hidden group-open:inline">접기</span></span>
          </summary>
          <div className="border-t border-border p-4 text-sm sm:p-5">
            <dl className="grid grid-cols-[5rem_minmax(0,1fr)] gap-x-3 gap-y-2 break-words">
              <dt className="text-muted-foreground">발생 지점</dt><dd>{log.step} · {log.area}</dd>
              <dt className="text-muted-foreground">오류 코드</dt><dd>{log.code}</dd>
              <dt className="text-muted-foreground">처음 발생</dt><dd>{formatShortDateTime(log.first_seen_at)}</dd>
              <dt className="text-muted-foreground">최근 발생</dt><dd>{formatShortDateTime(log.last_seen_at)}</dd>
              <dt className="text-muted-foreground">재발 횟수</dt><dd>{log.recurrences}회</dd>
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{log.operation === "browser" ? "브라우저에서 보낸 확인 전 신고입니다. 같은 종류·영역은 1분에 한 번 집계하므로 실제 발생 횟수와 다를 수 있습니다." : "같은 기능·처리 지점·오류 코드를 묶습니다. 입력 내용과 개인정보는 수집하지 않습니다."}</p>
            {(log.operation === "sms" || log.step.startsWith("sms")) && <Link href="/admin/sms" className="mt-2 inline-flex min-h-11 items-center text-primary hover:underline">SMS 발송 내역 확인</Link>}
            <LogStatusForm key={`${log.id}-${log.last_seen_at}-${log.status}`} log={log} />
          </div>
        </details>)}
      </div>}
    {!failed && <nav aria-label="오류 로그 페이지" className="mt-6 flex items-center justify-center gap-6 text-sm">
      {page > 1 && <Link className="inline-flex min-h-11 items-center hover:underline" href={href(page - 1)}>이전</Link>}
      <span>{page} / {Math.max(1, Math.ceil(count / 20))}</span>
      {page * 20 < count && <Link className="inline-flex min-h-11 items-center hover:underline" href={href(page + 1)}>다음</Link>}
    </nav>}
  </div>
}
