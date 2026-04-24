import { createClient } from "@/shared/lib/supabase/server"

export interface AuthorInfo {
  nickname: string
  role: string
}

/**
 * created_by 배열을 받아 profiles 테이블에서 일괄 조회 후 id → AuthorInfo 맵 반환
 */
export async function fetchAuthorMap(
  ids: (string | null | undefined)[]
): Promise<Record<string, AuthorInfo>> {
  const uniqueIds = [...new Set(ids.filter(Boolean))] as string[]
  if (uniqueIds.length === 0) return {}

  const supabase = await createClient()
  const { data } = await supabase
    .from("profiles")
    .select("id, nickname, role")
    .in("id", uniqueIds)

  const map: Record<string, AuthorInfo> = {}
  for (const p of data ?? []) {
    map[p.id] = { nickname: p.nickname, role: p.role }
  }
  return map
}
