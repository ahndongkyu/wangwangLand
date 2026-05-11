import { createClient } from "@/shared/lib/supabase/server"

export interface AuthorInfo {
  nickname: string
  role: string
  /** 봉사 인증 횟수 (등급 표시용) */
  volunteer_count?: number
}

/**
 * created_by 배열을 받아 profiles 테이블에서 일괄 조회 후 id → AuthorInfo 맵 반환.
 * 봉사 인증 카운트(`volunteer_count`)도 함께 채워서 닉네임 옆 등급 뱃지 노출에 사용.
 */
export async function fetchAuthorMap(
  ids: (string | null | undefined)[]
): Promise<Record<string, AuthorInfo>> {
  const uniqueIds = [...new Set(ids.filter(Boolean))] as string[]
  if (uniqueIds.length === 0) return {}

  const supabase = await createClient()

  const [profilesRes, certsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, nickname, role")
      .in("id", uniqueIds),
    supabase
      .from("daily_posts")
      .select("created_by")
      .eq("category", "봉사 후기")
      .not("related_volunteer_application_id", "is", null)
      .in("created_by", uniqueIds),
  ])

  // 봉사 카운트 집계
  const countMap: Record<string, number> = {}
  for (const id of uniqueIds) countMap[id] = 0
  for (const row of (certsRes.data ?? []) as { created_by: string }[]) {
    if (row.created_by) countMap[row.created_by] = (countMap[row.created_by] ?? 0) + 1
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
