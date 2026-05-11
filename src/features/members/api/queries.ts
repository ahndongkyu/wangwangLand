import { unstable_cache } from "next/cache"

import { createClient } from "@/shared/lib/supabase/server"
import { createAdminClient } from "@/shared/lib/supabase/admin"

/** status별 회원 수 — 60초 캐싱. 변경 빈도 낮으니 페이지 로딩 부담 ↓ */
const getCachedStatusCounts = unstable_cache(
  async () => {
    const admin = createAdminClient()
    const [p, a, r] = await Promise.all([
      admin.from("profiles").select("id", { count: "exact", head: true }).eq("status", "pending"),
      admin.from("profiles").select("id", { count: "exact", head: true }).eq("status", "approved"),
      admin.from("profiles").select("id", { count: "exact", head: true }).eq("status", "rejected"),
    ])
    return {
      pendingCount: p.count ?? 0,
      approvedCount: a.count ?? 0,
      rejectedCount: r.count ?? 0,
    }
  },
  ["profile-status-counts"],
  { revalidate: 60, tags: ["profile-status-counts"] }
)

export interface Profile {
  id: string
  nickname: string
  avatar_url: string | null
  phone: string | null
  role: "member" | "full_member" | "staff" | "admin"
  status: "pending" | "approved" | "rejected"
  is_banned: boolean
  created_at: string
  terms_agreed_at: string | null
  terms_version: string | null
  privacy_agreed_at: string | null
  privacy_version: string | null
  marketing_agreed_at: string | null
  notices_last_seen_at: string | null
  daily_last_seen_at: string | null
  stories_last_seen_at: string | null
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  // getSession()은 쿠키만 읽어 네트워크 호출 없음 → 동시 refresh 충돌 방지
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return null

  const { data } = await supabase
    .from("profiles")
    .select("id, nickname, avatar_url, phone, role, status, is_banned, created_at, terms_agreed_at, terms_version, privacy_agreed_at, privacy_version, marketing_agreed_at, notices_last_seen_at, daily_last_seen_at, stories_last_seen_at")
    .eq("id", session.user.id)
    .maybeSingle()

  return data as Profile | null
}

export interface PaginatedProfiles {
  profiles: Profile[]
  total: number
  pendingCount: number
  approvedCount: number
  rejectedCount: number
}

/** 어드민 상세 페이지용: 특정 회원의 프로필 + 이메일(auth.users 에서 조회) */
export interface ProfileDetail extends Profile {
  email: string | null
  /** OAuth provider (kakao / google / ...) 또는 "email". 미상이면 null. */
  signup_provider: string | null
}

export async function getProfileDetail(id: string): Promise<ProfileDetail | null> {
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, nickname, avatar_url, phone, role, status, is_banned, created_at, terms_agreed_at, terms_version, privacy_agreed_at, privacy_version, marketing_agreed_at, notices_last_seen_at, daily_last_seen_at, stories_last_seen_at")
    .eq("id", id)
    .maybeSingle()
  if (!profile) return null

  // auth.users 의 email / provider 는 service role 만 조회 가능
  let email: string | null = null
  let signup_provider: string | null = null
  try {
    const { createAdminClient } = await import("@/shared/lib/supabase/admin")
    const admin = createAdminClient()
    const { data } = await admin.auth.admin.getUserById(id)
    email = data?.user?.email ?? null
    signup_provider =
      (data?.user?.app_metadata?.provider as string | undefined) ?? null
  } catch (e) {
    console.warn("[getProfileDetail] failed to fetch auth user:", e)
  }

  return { ...(profile as Profile), email, signup_provider }
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

  const isFiltered = !!status || !!searchQuery?.trim()

  // 필터 적용 시에만 메인 쿼리에 exact count (필터된 결과의 페이지 매김용).
  // 필터 없을 땐 캐시된 status counts 합으로 total 계산 → 메인 쿼리 부담 ↓
  let query = supabase
    .from("profiles")
    .select(
      "id, nickname, avatar_url, phone, role, status, is_banned, created_at, terms_agreed_at, terms_version, privacy_agreed_at, privacy_version, marketing_agreed_at",
      isFiltered ? { count: "exact" } : undefined
    )

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

  const [mainRes, cachedCounts] = await Promise.all([
    query,
    getCachedStatusCounts(),
  ])

  const { data, count, error } = mainRes
  if (error) {
    console.error("[listProfiles]", error)
    return { profiles: [], total: 0, pendingCount: 0, approvedCount: 0, rejectedCount: 0 }
  }

  const total = isFiltered
    ? count ?? 0
    : cachedCounts.pendingCount + cachedCounts.approvedCount + cachedCounts.rejectedCount

  return {
    profiles: (data ?? []) as Profile[],
    total,
    pendingCount: cachedCounts.pendingCount,
    approvedCount: cachedCounts.approvedCount,
    rejectedCount: cachedCounts.rejectedCount,
  }
}
