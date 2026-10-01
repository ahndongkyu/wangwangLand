import type { ApplicationStatusCounts } from "@/features/applications/api/queries"

export function AdminStatusChart({ title, counts }: { title: string; counts: ApplicationStatusCounts }) {
  const statuses = ["접수", "검토중", "일정변경요청", "승인", "반려", "취소"] as const
  const max = Math.max(1, ...statuses.map((status) => counts[status]))
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">전체 기간 · 현재 처리 상태 · 총 {counts.total.toLocaleString()}건</p>
      <dl className="mt-5 space-y-3">
        {statuses.map((status) => (
          <div key={status} className="grid grid-cols-[5.5rem_1fr_3.5rem] items-center gap-3 text-xs">
            <dt>{status}</dt>
            <div aria-hidden className="h-3 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary" style={{ width: `${counts[status] / max * 100}%` }} />
            </div>
            <dd className="text-right font-semibold tabular-nums">{counts[status].toLocaleString()}건</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
