import { normalizeMemberRole, type MemberRole } from "@/shared/lib/member-role"
import { unstable_cache } from "next/cache"
import { recentMonthWindows } from "@/shared/lib/month-windows"

import { createClient } from "@/shared/lib/supabase/server"
import { createAdminClient } from "@/shared/lib/supabase/admin"
import { requireAdmin } from "@/shared/lib/auth"
import { recordPrivacyAccess } from "@/shared/lib/privacy-audit"
import {
  DEFAULT_HOME_FAVORITES,
  isHomeFavoriteKey,
  type HomeFavoriteKey,
} from "@/shared/constants/home-navigation"

/** status별 회원 수 — 60초 캐싱. 변경 빈도 낮으니 페이지 로딩 부담 ↓ */
const getCachedStatusCounts = unstable_cache(
  async () => {
    const admin = createAdminClient()
    const [p, a, r] = await Promise.all([
      admin.from("profiles").select("id", { count: "exact", head: true }).eq("status", "pending"),
      admin.from("profiles").select("id", { count: "exact", head: true }).eq("status", "approved"),
      admin.from("profiles").select("id", { count: "exact", head: true }).eq("status", "rejected"),
    ])
    if (p.error || a.error || r.error) throw new Error("회원 현황을 불러오지 못했습니다.", { cause: p.error || a.error || r.error })
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
  role: MemberRole
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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from("profiles")
    .select("id, nickname, avatar_url, phone, role, status, is_banned, created_at, terms_agreed_at, terms_version, privacy_agreed_at, privacy_version, marketing_agreed_at, notices_last_seen_at, daily_last_seen_at, stories_last_seen_at")
    .eq("id", user.id)
    .maybeSingle()

  return data && data.is_banned === false ? { ...data, role: normalizeMemberRole(data.role) } as Profile : null
}

export async function listMyHomeFavorites(): Promise<HomeFavoriteKey[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return DEFAULT_HOME_FAVORITES

  const { data, error } = await supabase
    .from("profiles")
    .select("favorite_menu_items")
    .eq("id", user.id)
    .maybeSingle()

  if (error) return DEFAULT_HOME_FAVORITES

  const values = Array.isArray(data?.favorite_menu_items)
    ? data.favorite_menu_items.filter(
        (value): value is string => typeof value === "string"
      )
    : []
  const valid = values.filter(isHomeFavoriteKey)
  return valid.length > 0 ? valid : DEFAULT_HOME_FAVORITES
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
  const auth = await requireAdmin()
  if (!auth.ok) return null
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, nickname, avatar_url, phone, role, status, is_banned, created_at, terms_agreed_at, terms_version, privacy_agreed_at, privacy_version, marketing_agreed_at, notices_last_seen_at, daily_last_seen_at, stories_last_seen_at")
    .eq("id", id)
    .maybeSingle()
  if (!profile) return null
  await recordPrivacyAccess(auth.userId, "member", id)

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

  return { ...(profile as Profile), role: normalizeMemberRole(profile.role), email, signup_provider }
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
  const auth = await requireAdmin()
  if (!auth.ok) return { profiles: [], total: 0, pendingCount: 0, approvedCount: 0, rejectedCount: 0 }
  const supabase = await createClient()

  const fields = "id, nickname, avatar_url, phone, role, status, is_banned, created_at, terms_agreed_at, terms_version, privacy_agreed_at, privacy_version, marketing_agreed_at"
  const term = searchQuery?.trim().replace(/[%,()]/g, "")
  function makeQuery(group?: Profile["status"], head = false) {
    let query = supabase.from("profiles").select(fields, { count: "exact", head })
    if (group) query = query.eq("status", group)
    if (term) query = query.or(`nickname.ilike.%${term}%,phone.ilike.%${term}%`)
    return query
  }
  let data: Profile[] = []
  let total = 0
  if (sort === "status" && !status) {
    // 상태 문자열의 사전순 대신 업무 우선순위로 페이지 범위를 계산한다.
    const groups = ["pending", "approved", "rejected"] as const
    const counts = await Promise.all(groups.map(group => makeQuery(group, true)))
    for (const result of counts) if (result.error) throw new Error("회원 목록을 불러오지 못했습니다.", { cause: result.error })
    total = counts.reduce((sum, result) => sum + (result.count ?? 0), 0)
    let skip = offset
    let remaining = limit
    for (let i = 0; i < groups.length && remaining > 0; i++) {
      const count = counts[i].count ?? 0
      if (skip >= count) { skip -= count; continue }
      const take = Math.min(remaining, count - skip)
      const result = await makeQuery(groups[i]).order("created_at", { ascending: false }).order("id", { ascending: true }).range(skip, skip + take - 1)
      if (result.error) throw new Error("회원 목록을 불러오지 못했습니다.", { cause: result.error })
      data.push(...(result.data ?? []) as Profile[])
      remaining -= take
      skip = 0
    }
  } else {
    const result = await makeQuery(status).order(sort === "name" ? "nickname" : "created_at", { ascending: sort === "name" }).order("id", { ascending: true }).range(offset, offset + limit - 1)
    if (result.error) throw new Error("회원 목록을 불러오지 못했습니다.", { cause: result.error })
    data = (result.data ?? []) as Profile[]
    total = result.count ?? 0
  }
  const cachedCounts = await getCachedStatusCounts()

  return {
    profiles: (data ?? []).map(profile => ({ ...profile, role: normalizeMemberRole(profile.role) })) as Profile[],
    total,
    pendingCount: cachedCounts.pendingCount,
    approvedCount: cachedCounts.approvedCount,
    rejectedCount: cachedCounts.rejectedCount,
  }
}

export interface MonthlyMemberStat {
  month: string  // "YYYY-MM"
  label: string  // "1월"
  rescued: number  // 신규 가입 수 (차트 컴포넌트와 동일 키 재사용)
}

/** 최근 N개월 신규 회원 가입 추이 */
export async function getMonthlyMemberStats(months = 6): Promise<MonthlyMemberStat[]> {
  const supabase = await createAdminClient()
  return Promise.all(recentMonthWindows(months).map(async (window) => {
    const { count, error } = await supabase.from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", window.from).lt("created_at", window.to)
    if (error) throw new Error("월별 통계를 불러오지 못했습니다.", { cause: error })
    return { month: window.month, label: window.label, rescued: count ?? 0 }
  }))
}
