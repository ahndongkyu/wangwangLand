import { createClient } from "@/shared/lib/supabase/server"
import { normalizeMemberRole } from "@/shared/lib/member-role"

export interface AuthorInfo {
  nickname: string
  role: string
}

/** 게시글 작성자 정보를 일괄 조회한다. */
export async function fetchAuthorMap(
  ids: (string | null | undefined)[]
): Promise<Record<string, AuthorInfo>> {
  const uniqueIds = [...new Set(ids.filter(Boolean))] as string[]
  if (uniqueIds.length === 0) return {}
  const supabase = await createClient()
  const { data } = await supabase.from("profiles").select("id, nickname, role").in("id", uniqueIds)
  const map: Record<string, AuthorInfo> = {}
  for (const profile of data ?? []) {
    map[profile.id] = { nickname: profile.nickname, role: normalizeMemberRole(profile.role) }
  }
  return map
}
