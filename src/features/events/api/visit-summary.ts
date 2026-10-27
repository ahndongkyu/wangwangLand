import "server-only"
import { requireAdmin } from "@/shared/lib/auth"
import { createClient } from "@/shared/lib/supabase/server"
import { recordOperationError } from "@/features/operation-logs/server"
import type { CalendarEvent } from "../types"
import { summarizeVisits, type VisitApplication } from "../lib/visit-summary"

export async function getVolunteerVisitSummary(events: CalendarEvent[]) {
  const auth = await requireAdmin()
  if (!auth.ok) throw new Error(auth.error)
  const ids = [...new Set(events.filter(event => event.source_application_type === "volunteer" && event.source_application_id).map(event => event.source_application_id!))]
  if (!ids.length) return {}
  try {
    const client = await createClient()
    const applications: VisitApplication[] = []
    for (let offset = 0; offset < ids.length; offset += 200) {
      const { data, error } = await client.from("volunteer_applications")
        .select("id,status,party_size").in("id", ids.slice(offset, offset + 200))
      if (error || !data) throw new Error("봉사 방문 예정 인원 조회 실패", { cause: error })
      applications.push(...data as VisitApplication[])
    }
    return summarizeVisits(events, applications)
  } catch (error) {
    await recordOperationError("query", "getVolunteerVisitSummary", error, "admin")
    throw error
  }
}
