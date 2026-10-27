import type { DashboardStats } from "@/features/applications/api/dashboard"

const statuses = ["접수", "검토중", "일정변경요청", "승인", "반려", "취소"] as const
const number = (value: number) => value.toLocaleString("ko-KR")

export function DashboardStatistics({ stats, approvedPeople }: { stats: DashboardStats | null; approvedPeople: number | null }) {
  return <section aria-labelledby="dashboard-statistics" className="min-w-0">
    <h2 id="dashboard-statistics" className="mb-3 text-base font-semibold">전체 통계</h2>
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3">
        <h3 className="text-sm font-medium">누적 승인 봉사 인원</h3>
        <p className="text-xl font-bold tabular-nums sm:text-3xl">{approvedPeople === null ? "조회 실패" : <>{number(approvedPeople)}<span className="ml-1 text-sm font-normal text-muted-foreground">명</span></>}</p>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">승인된 신청의 동반 인원 포함 · 반복 신청 포함 · 실제 방문 인원과 다를 수 있습니다.</p>
      {!stats ? <p role="alert" className="mt-4 text-sm text-destructive">신청 통계를 불러오지 못했습니다. 새로고침해 주세요.</p> : <>
        <div className="mt-4 grid min-w-0 gap-4 sm:mt-5 sm:gap-6 lg:grid-cols-[1fr_1.5fr]">
          <div className="min-w-0">
            <h3 className="mb-2 text-sm font-semibold">신청 상태별 현황</h3>
            <table className="w-full table-fixed text-xs [&_td]:py-1.5 [&_th]:py-1.5 sm:text-sm sm:[&_td]:py-2 sm:[&_th]:py-2">
              <caption className="sr-only">전체 기간 신청 상태별 건수</caption>
              <thead className="border-y border-border bg-muted/50 text-xs text-muted-foreground"><tr><th scope="col" className="w-[44%] py-2 text-left font-medium">상태</th><th scope="col" className="py-2 text-right font-medium">봉사</th><th scope="col" className="py-2 text-right font-medium">입양 상담</th></tr></thead>
              <tbody>{statuses.map(status => <tr key={status} className="border-b border-border/60"><th scope="row" className="py-2 text-left text-xs font-normal sm:text-sm">{status === "일정변경요청" ? "일정 변경" : status === "반려" ? "반려·거절" : status}</th><td className="py-2 text-right tabular-nums">{number(stats.volunteer[status])}</td><td className="py-2 text-right tabular-nums">{status === "일정변경요청" ? "—" : number(stats.adoption[status])}</td></tr>)}</tbody>
              <tfoot><tr><th scope="row" className="pt-3 text-left">합계</th><td className="pt-3 text-right font-semibold tabular-nums">{number(stats.volunteer.total)}</td><td className="pt-3 text-right font-semibold tabular-nums">{number(stats.adoption.total)}</td></tr></tfoot>
            </table>
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">월별 신청 추이</h3>
            <p className="mt-1 text-xs text-muted-foreground">접수일 기준 · 이번 달 포함 최근 3개월</p>
            <div className="mt-4 hidden gap-5 md:grid md:grid-cols-2" data-dashboard-charts>
              {([['volunteer', '봉사 신청'], ['adoption', '입양 상담']] as const).map(([key, label]) => {
                const max = Math.max(1, ...stats.monthly.map(row => row[key]))
                return <div key={key}><h4 className="mb-3 text-xs font-medium">{label}</h4><div className="space-y-4">{stats.monthly.map(row => <div key={row.month} className="grid grid-cols-[2.5rem_minmax(0,1fr)_3rem] items-center gap-2 text-xs"><span title={row.month}>{row.label}</span><div aria-hidden className="h-5 overflow-hidden rounded bg-muted"><div className={key === "volunteer" ? "h-full rounded bg-primary/80" : "h-full rounded bg-foreground/50"} style={{ width: `${row[key] / max * 100}%` }} /></div><span className="text-right tabular-nums">{number(row[key])}건</span></div>)}</div></div>
              })}
            </div>
            <table className="mt-3 w-full table-fixed text-xs [&_td]:py-1.5 [&_th]:py-1.5 sm:text-sm md:hidden" data-dashboard-monthly-table>
              <caption className="sr-only">최근 3개월 신청 건수</caption>
              <thead className="border-y border-border bg-muted/50 text-xs text-muted-foreground"><tr><th scope="col" className="py-2 text-left font-medium">월</th><th scope="col" className="py-2 text-right font-medium">봉사</th><th scope="col" className="py-2 text-right font-medium">입양 상담</th></tr></thead>
              <tbody>{stats.monthly.map(row => <tr key={row.month} className="border-b border-border/60"><th scope="row" className="py-2 text-left font-normal">{row.month.replace('-', '.')}</th><td className="py-2 text-right tabular-nums">{number(row.volunteer)}</td><td className="py-2 text-right tabular-nums">{number(row.adoption)}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      </>}
    </div>
  </section>
}
