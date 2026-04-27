import { createClient } from "@/shared/lib/supabase/server"

export interface Profile {
  id: string
  nickname: string
  avatar_url: string | null
  role: "member" | "full_member" | "staff" | "admin"
  status: "pending" | "approved" | "rejected"
  is_banned: boolean
  created_at: string
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  // getSession()은 쿠키만 읽어 네트워크 호출 없음 → 동시 refresh 충돌 방지
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return null

  const { data } = await supabase
    .from("profiles")
    .select("id, nickname, avatar_url, role, status, is_banned, created_at")
    .eq("id", session.user.id)
    .maybeSingle()

  return data as Profile | null
}

export interface PaginatedProfiles {
  profiles: Profile[]
  total: number
}

export type ProfileSort = "name" | "joined" | "status"

export async function listProfiles({
  status,
  sort = "status",
  limit = 30,
  offset = 0,
}: {
  status?: Profile["status"]
  sort?: ProfileSort
  limit?: number
  offset?: number
} = {}): Promise<PaginatedProfiles> {
  const supabase = await createClient()

  let query = supabase
    .from("profiles")
    .select("id, nickname, avatar_url, role, status, is_banned, created_at", { count: "exact" })

  if (sort === "name") {
    query = query.order("nickname", { ascending: true })
  } else if (sort === "joined") {
    query = query.order("created_at", { ascending: false })
  } else {
    // status: pending 먼저, 그 다음 가입일 최신순
    query = query
      .order("status", { ascending: true })
      .order("created_at", { ascending: false })
  }

  query = query.range(offset, offset + limit - 1)

  if (status) {
    query = query.eq("status", status)
  }

  const { data, count, error } = await query
  if (error) {
    console.error("[listProfiles]", error)
    return { profiles: [], total: 0 }
  }

  return { profiles: (data ?? []) as Profile[], total: count ?? 0 }
}
