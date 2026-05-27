import { createClient } from "@/shared/lib/supabase/server"
import { createServiceClient } from "@/shared/lib/supabase/service"

export interface AuthorInfo {
  nickname: string
  role: string
  /** 봉사 횟수 (등급 표시용) */
  volunteer_count?: number
}

/**
 * created_by 배열을 받아 profiles + 봉사 횟수를 일괄 조회.
 * 봉사 횟수 기준: 승인된 volunteer_applications 중 available_dates[0] < 오늘
 */
export async function fetchAuthorMap(
  ids: (string | null | undefined)[]
): Promise<Record<string, AuthorInfo>> {
  const uniqueIds = [...new Set(ids.filter(Boolean))] as string[]
  if (uniqueIds.length === 0) return {}

  const supabase = await createClient()
  const service = createServiceClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [profilesRes, appsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, nickname, role")
      .in("id", uniqueIds),
    service
      .from("volunteer_applications")
      .select("created_by, available_dates")
      .eq("status", "승인")
      .in("created_by", uniqueIds),
  ])

  // 봉사 카운트 집계
  const countMap: Record<string, number> = {}
  for (const id of uniqueIds) countMap[id] = 0

  for (const app of (appsRes.data ?? []) as { created_by: string; available_dates: string[] }[]) {
    const dates = app.available_dates
    if (!dates || dates.length === 0) continue
    const [y, m, d] = dates[0].split("-").map(Number)
    const volunteerDate = new Date(y, m - 1, d)
    if (volunteerDate < today) {
      countMap[app.created_by] = (countMap[app.created_by] ?? 0) + 1
    }
  }

  const map: Record<string, AuthorInfo> = {}
  for (const p of profilesRes.data ?? []) {
    map[p.id] = {
      nickname: p.nickname,
      role: p.role,
      volunteer_count: countMap[p.id] ?? 0,
    }
  }
  return map
}
