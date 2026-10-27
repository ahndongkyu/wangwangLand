import type { CalendarEvent } from "../types"
import { dateKey } from "./date"

export interface VisitSummary { visits: number; people: number; unknown: number }
export interface VisitApplication { id: string; status: string; party_size: number }

/** 신청과 연결된 확정 일정만 집계한다. 참석 여부나 고유 봉사자 수가 아니다. */
export function summarizeVisits(events: CalendarEvent[], applications: VisitApplication[]): Record<string, VisitSummary> {
  const apps = new Map(applications.map(app => [app.id, app]))
  const seen = new Set<string>()
  const days: Record<string, VisitSummary> = {}
  for (const event of events) {
    if (seen.has(event.id) || event.source_application_type !== "volunteer" || !event.source_application_id) continue
    seen.add(event.id)
    const day = dateKey(new Date(event.starts_at))
    const app = apps.get(event.source_application_id)
    const summary = days[day] ??= { visits: 0, people: 0, unknown: 0 }
    // 변경 요청 중에도 기존 확정 일정은 유지된다.
    if (!app || !["승인", "일정변경요청"].includes(app.status) || !Number.isSafeInteger(app.party_size) || app.party_size < 1) {
      summary.unknown++
      continue
    }
    summary.visits++
    summary.people += app.party_size
  }
  return days
}
