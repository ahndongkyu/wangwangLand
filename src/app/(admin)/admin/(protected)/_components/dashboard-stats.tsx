import type { DashboardStats } from "@/features/applications/api/dashboard"

const statuses = ["접수", "검토중", "일정변경요청", "승인", "반려", "취소"] as const
const number = (value: number) => value.toLocaleString("ko-KR")

export function DashboardStatistics({ stats, approvedPeople }: { stats: DashboardStats | null; approvedPeople: number | null }) {
  return <section aria-labelledby="dashboard-statistics" className="min-w-0">
    <h2 id="dashboard-statistics" className="mb-3 text-base font-semibold">전체 통계</h2>
    <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3">
        <h3 className="text-sm font-medium">누적 승인 봉사 인원</h3>
        <p className="text-xl font-bold tabular-nums sm:text-3xl">{approvedPeople === null ? "조회 실패" : <>{number(approvedPeople)}<span className="ml-1 text-sm font-normal text-muted-foreground">명</span></>}</p>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">승인된 신청의 동반 인원 포함 · 반복 신청 포함 · 실제 방문 인원과 다를 수 있습니다.</p>
      {!stats ? <p role="alert" className="mt-4 text-sm text-destructive">신청 통계를 불러오지 못했습니다. 새로고침해 주세요.</p> : <>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4" data-dashboard-comparison>
          {([['volunteer', '봉사 신청'], ['adoption', '입양 상담']] as const).map(([key, label]) => {
            const value = stats.comparison[key]
            return <div key={key} className="min-w-0 rounded-xl border border-border bg-muted/20 p-3 sm:p-4">
              <h3 className="text-xs font-medium sm:text-sm">이번 달 {label}</h3>
              <p className="mt-2 text-2xl font-bold tabular-nums">{number(value.current)}<span className="ml-1 text-xs font-normal text-muted-foreground">건</span></p>
              <p className="mt-2 text-xs font-medium leading-5 text-primary sm:text-sm">{value.percent === null ? "전월 동기간 0건" : <>전월 대비 <span className="whitespace-nowrap tabular-nums">{value.percent > 0 ? "+" : ""}{value.percent.toFixed(1)}%</span></>}</p>
              {value.percent !== null && <p className="mt-1 text-xs text-muted-foreground">전월 동기간 {number(value.previous)}건</p>}
            </div>
          })}
        </div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">접수일 기준 · 전월 같은 날짜·시각까지 비교 (한국 시간){stats.comparison.cappedAtMonthEnd ? " · 전월에 같은 날짜가 없어 말일까지 비교" : ""}</p>
        <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] lg:gap-10">
          <div className="min-w-0">
            <h3 className="mb-2 text-sm font-semibold">신청 상태별 현황</h3>
            <table className="w-full table-fixed text-xs [&_td]:px-3 [&_th]:px-3 [&_td]:py-1.5 [&_th]:py-1.5 sm:text-sm sm:[&_td]:py-2 sm:[&_th]:py-2">
              <caption className="sr-only">전체 기간 신청 상태별 건수</caption>
              <colgroup><col className="w-[40%]" /><col className="w-[30%]" /><col className="w-[30%]" /></colgroup>
              <thead className="border-y border-border bg-muted/50 text-xs text-muted-foreground"><tr><th scope="col" className="py-2 text-left font-medium">상태</th><th scope="col" className="py-2 text-center font-medium">봉사</th><th scope="col" className="py-2 text-center font-medium">입양 상담</th></tr></thead>
              <tbody>{statuses.map(status => <tr key={status} className="border-b border-border/60"><th scope="row" className="py-2 text-left text-xs font-normal sm:text-sm">{status === "일정변경요청" ? "일정 변경" : status === "반려" ? "반려·거절" : status}</th><td className="py-2 text-center tabular-nums">{number(stats.volunteer[status])}</td><td className="py-2 text-center tabular-nums">{status === "일정변경요청" ? "—" : number(stats.adoption[status])}</td></tr>)}</tbody>
              <tfoot><tr><th scope="row" className="pt-3 text-left">합계</th><td className="pt-3 text-center font-semibold tabular-nums">{number(stats.volunteer.total)}</td><td className="pt-3 text-center font-semibold tabular-nums">{number(stats.adoption.total)}</td></tr></tfoot>
            </table>
          </div>
          <div className="min-w-0 rounded-xl bg-muted/30 p-4 sm:p-5">
            <h3 className="text-sm font-semibold">월별 신청 추이</h3>
            <p className="mt-1 text-xs text-muted-foreground">접수일 기준 · 이번 달 포함 최근 5개월</p>
            <div className="mt-5 hidden gap-6 md:grid md:grid-cols-2" data-dashboard-charts>
              {([['volunteer', '봉사 신청'], ['adoption', '입양 상담']] as const).map(([key, label]) => {
                const max = Math.max(1, ...stats.monthly.map(row => row[key]))
                return <div key={key} className="min-w-0"><h4 className="mb-3 px-2 text-xs font-medium">{label}</h4><div className="space-y-1">{stats.monthly.map(row => <div key={row.month} title={`${row.month} · ${label} ${number(row[key])}건`} className="group grid min-h-11 grid-cols-[2rem_minmax(0,1fr)_max-content] items-center gap-2 rounded-lg px-2 py-2 text-xs transition-colors hover:bg-card hover:shadow-sm motion-reduce:transition-none"><span>{row.label}</span><div aria-hidden className="h-5 overflow-hidden rounded bg-muted"><div className={`h-full rounded transition-colors motion-reduce:transition-none ${key === "volunteer" ? "bg-primary/70 group-hover:bg-primary" : "bg-foreground/40 group-hover:bg-foreground/70"}`} style={{ width: `${row[key] / max * 100}%` }} /></div><span className="text-right font-medium tabular-nums">{number(row[key])}건</span></div>)}</div></div>
              })}
            </div>
            <table className="mt-3 w-full table-fixed text-xs [&_td]:px-2 [&_th]:px-2 [&_td]:py-1.5 [&_th]:py-1.5 sm:text-sm md:hidden" data-dashboard-monthly-table>
              <caption className="sr-only">최근 5개월 신청 건수</caption>
              <colgroup><col className="w-[40%]" /><col className="w-[30%]" /><col className="w-[30%]" /></colgroup>
              <thead className="border-y border-border bg-muted/50 text-xs text-muted-foreground"><tr><th scope="col" className="py-2 text-left font-medium">월</th><th scope="col" className="py-2 text-center font-medium">봉사</th><th scope="col" className="py-2 text-center font-medium">입양 상담</th></tr></thead>
              <tbody>{stats.monthly.map(row => <tr key={row.month} className="border-b border-border/60"><th scope="row" className="py-2 text-left font-normal">{row.month.replace('-', '.')}</th><td className="py-2 text-center tabular-nums">{number(row.volunteer)}</td><td className="py-2 text-center tabular-nums">{number(row.adoption)}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      </>}
    </div>
  </section>
}
