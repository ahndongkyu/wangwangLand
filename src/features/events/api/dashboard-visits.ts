import "server-only"
import { requireAdmin } from "@/shared/lib/auth"
import { createClient } from "@/shared/lib/supabase/server"
import { recordOperationError } from "@/features/operation-logs/server"
import type { CalendarEvent } from "../types"

/** 확정 일정과 현재 신청 상태를 함께 확인한다. 출석 여부를 기록하지 않는다. */
export async function getDashboardVisits(events: CalendarEvent[]) {
  const auth = await requireAdmin()
  if (!auth.ok) throw new Error("관리자 권한이 필요합니다.")
  const client = await createClient()
  try {
    const results = await Promise.all((["volunteer", "adoption"] as const).map(async type => {
      const linked = events.filter(event => event.source_application_type === type && event.source_application_id)
      const ids = [...new Set(linked.map(event => event.source_application_id!))]
      const apps = new Map<string, { status: string; party_size?: number }>()
      for (let i = 0; i < ids.length; i += 200) {
        const { data, error } = await client.from(type === "volunteer" ? "volunteer_applications" : "adoption_applications")
          .select(type === "volunteer" ? "id,status,party_size" : "id,status").in("id", ids.slice(i, i + 200))
        if (error) throw error
        for (const row of (data ?? []) as unknown as Array<{ id: string; status: string; party_size?: number }>) apps.set(row.id, row)
      }
      return linked.flatMap(event => {
        const app = apps.get(event.source_application_id!)
        if (!app || !(type === "volunteer" ? ["승인", "일정변경요청"] : ["승인"]).includes(app.status)) return []
        return [{ ...event, kind: type, people: type === "volunteer" && Number.isSafeInteger(app.party_size) && app.party_size! > 0 ? app.party_size! : null }]
      })
    }))
    return [...new Map(results.flat().map(event => [event.id, event])).values()].sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  } catch (error) {
    await recordOperationError("query", "getDashboardVisits", error, "admin")
    throw new Error("오늘 방문 일정을 불러오지 못했습니다.", { cause: error })
  }
}
