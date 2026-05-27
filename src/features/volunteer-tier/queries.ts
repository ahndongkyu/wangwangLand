import { createClient } from "@/shared/lib/supabase/server"

/** 사용자의 봉사 인증 글 수 (= 봉사 횟수) */
export async function getVolunteerCount(userId: string): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from("daily_posts")
    .select("id", { count: "exact", head: true })
    .eq("created_by", userId)
    .eq("category", "봉사 후기")
    .not("related_volunteer_application_id", "is", null)

  return count ?? 0
}

export interface VolunteerCountBreakdown {
  total: number
  yearly: number
  monthly: number
}

/** 총 / 올해 / 이번 달 봉사 횟수 한 번에 조회 */
export async function getVolunteerCountBreakdown(
  userId: string
): Promise<VolunteerCountBreakdown> {
  const supabase = await createClient()
  const now = new Date()
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const base = supabase
    .from("daily_posts")
    .select("id, created_at", { count: "exact" })
    .eq("created_by", userId)
    .eq("category", "봉사 후기")
    .not("related_volunteer_application_id", "is", null)

  const [totalRes, yearlyRes, monthlyRes] = await Promise.all([
    base,
    base.gte("created_at", yearStart),
    base.gte("created_at", monthStart),
  ])

  return {
    total: totalRes.count ?? 0,
    yearly: yearlyRes.count ?? 0,
    monthly: monthlyRes.count ?? 0,
  }
}

/** 여러 사용자의 카운트 한 번에 조회 (목록 페이지에서 활용) */
export async function getVolunteerCountMap(userIds: string[]): Promise<Record<string, number>> {
  if (userIds.length === 0) return {}
  const supabase = await createClient()
  const { data } = await supabase
    .from("daily_posts")
    .select("created_by")
    .eq("category", "봉사 후기")
    .not("related_volunteer_application_id", "is", null)
    .in("created_by", userIds)

  const map: Record<string, number> = {}
  for (const id of userIds) map[id] = 0
  for (const row of (data ?? []) as { created_by: string }[]) {
    if (row.created_by) map[row.created_by] = (map[row.created_by] ?? 0) + 1
  }
  return map
}
