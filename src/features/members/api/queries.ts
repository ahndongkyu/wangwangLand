import { createClient } from "@/shared/lib/supabase/server"

export interface Profile {
  id: string
  nickname: string
  avatar_url: string | null
  phone: string | null
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
    .select("id, nickname, avatar_url, phone, role, status, is_banned, created_at")
    .eq("id", session.user.id)
    .maybeSingle()

  return data as Profile | null
}

export interface PaginatedProfiles {
  profiles: Profile[]
  total: number
}

/** 어드민 상세 페이지용: 특정 회원의 프로필 + 이메일(auth.users 에서 조회) */
export interface ProfileDetail extends Profile {
  email: string | null
}

export async function getProfileDetail(id: string): Promise<ProfileDetail | null> {
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, nickname, avatar_url, phone, role, status, is_banned, created_at")
    .eq("id", id)
    .maybeSingle()
  if (!profile) return null

  // auth.users 의 email 은 service role 만 조회 가능
  let email: string | null = null
  try {
    const { createAdminClient } = await import("@/shared/lib/supabase/admin")
    const admin = createAdminClient()
    const { data } = await admin.auth.admin.getUserById(id)
    email = data?.user?.email ?? null
  } catch (e) {
    console.warn("[getProfileDetail] failed to fetch email:", e)
  }

  return { ...(profile as Profile), email }
}

export type ProfileSort = "name" | "joined" | "status"

export async function listProfiles({
  status,
  sort = "status",
  query: searchQuery,
  limit = 30,
  offset = 0,
}: {
  status?: Profile["status"]
  sort?: ProfileSort
  query?: string
  limit?: number
  offset?: number
} = {}): Promise<PaginatedProfiles> {
  const supabase = await createClient()

  let query = supabase
    .from("profiles")
    .select("id, nickname, avatar_url, phone, role, status, is_banned, created_at", { count: "exact" })

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

  if (status) {
    query = query.eq("status", status)
  }

  if (searchQuery && searchQuery.trim()) {
    const term = searchQuery.trim().replace(/[%,]/g, "")
    // 닉네임 또는 핸드폰번호 부분 일치
    query = query.or(`nickname.ilike.%${term}%,phone.ilike.%${term}%`)
  }

  query = query.range(offset, offset + limit - 1)

  const { data, count, error } = await query
  if (error) {
    console.error("[listProfiles]", error)
    return { profiles: [], total: 0 }
  }

  return { profiles: (data ?? []) as Profile[], total: count ?? 0 }
}
