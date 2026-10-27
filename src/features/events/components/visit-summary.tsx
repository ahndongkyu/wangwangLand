import type { VisitSummary } from "../lib/visit-summary"

export function VisitSummaryPanel({ summary, past = false }: { summary: VisitSummary | null; past?: boolean }) {
  if (!summary) return <p role="alert" className="border-b border-border px-4 py-3 text-sm text-destructive">봉사 방문 예정 인원을 불러오지 못했습니다. 새로고침 후 다시 확인해 주세요.</p>
  return <div className="border-b border-border px-3 py-3 sm:px-4">
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
      <h3 className="font-semibold">{past ? "봉사 확정 일정" : "봉사 방문 예정"}</h3>
      <p className="tabular-nums"><strong>{summary.visits}건</strong><span className="mx-2 text-muted-foreground">·</span>신청 인원 <strong>{summary.people}명</strong></p>
    </div>
    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">신청과 연결된 확정 일정 기준 · 실제 참석 기록이 아닙니다.</p>
    {summary.unknown > 0 && <p className="mt-2 text-sm text-primary">연결된 신청 정보 확인 필요 {summary.unknown}건 · 합계에서 제외</p>}
  </div>
}
