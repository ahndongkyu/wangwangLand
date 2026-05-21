import { createClient } from "@/shared/lib/supabase/server"
import type {
  AdoptionApplication,
  ApplicationStatus,
  VolunteerApplication,
} from "@/shared/types/database"

export interface AdoptionRow extends AdoptionApplication {
  dog?: { id: string; name: string } | null
  cat?: { id: string; name: string } | null
}

interface ListOptions {
  status?: ApplicationStatus | "전체"
  /** 신청자 이름·전화 통합 검색 (ilike) */
  query?: string
  /** 제출일 이상 (ISO 날짜 YYYY-MM-DD) */
  from?: string
  /** 제출일 이하 (포함) */
  to?: string
  limit?: number
  offset?: number
}

function toStartOfDayIso(ymd?: string): string | undefined {
  if (!ymd) return undefined
  // YYYY-MM-DD 를 KST 00:00 로 해석 후 UTC ISO 로 변환
  const d = new Date(`${ymd}T00:00:00+09:00`)
  if (Number.isNaN(d.getTime())) return undefined
  return d.toISOString()
}

function toEndOfDayIso(ymd?: string): string | undefined {
  if (!ymd) return undefined
  const d = new Date(`${ymd}T23:59:59.999+09:00`)
  if (Number.isNaN(d.getTime())) return undefined
  return d.toISOString()
}

export async function listAdoptionApplications({
  status,
  query: searchQuery,
  from,
  to,
  limit = 20,
  offset = 0,
}: ListOptions = {}): Promise<{ rows: AdoptionRow[]; total: number }> {
  const supabase = await createClient()

  let query = supabase
    .from("adoption_applications")
    .select("*, dog:dogs(id, name), cat:cats(id, name)", { count: "exact" })
    .order("submitted_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (status && status !== "전체") {
    query = query.eq("status", status)
  }

  if (searchQuery && searchQuery.trim()) {
    const q = `%${searchQuery.trim()}%`
    query = query.or(`applicant_name.ilike.${q},phone.ilike.${q}`)
  }

  const fromIso = toStartOfDayIso(from)
  if (fromIso) query = query.gte("submitted_at", fromIso)
  const toIso = toEndOfDayIso(to)
  if (toIso) query = query.lte("submitted_at", toIso)

  const { data, count, error } = await query

  if (error) {
    console.error("[listAdoptionApplications]", error)
    return { rows: [], total: 0 }
  }

  return { rows: (data ?? []) as AdoptionRow[], total: count ?? 0 }
}

export async function listVolunteerApplications({
  status,
  query: searchQuery,
  from,
  to,
  limit = 20,
  offset = 0,
}: ListOptions = {}): Promise<{
  rows: VolunteerApplication[]
  total: number
}> {
  const supabase = await createClient()

  let query = supabase
    .from("volunteer_applications")
    .select("*", { count: "exact" })
    .order("submitted_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (status && status !== "전체") {
    query = query.eq("status", status)
  }

  if (searchQuery && searchQuery.trim()) {
    const q = `%${searchQuery.trim()}%`
    query = query.or(`applicant_name.ilike.${q},phone.ilike.${q}`)
  }

  const fromIso = toStartOfDayIso(from)
  if (fromIso) query = query.gte("submitted_at", fromIso)
  const toIso = toEndOfDayIso(to)
  if (toIso) query = query.lte("submitted_at", toIso)

  const { data, count, error } = await query

  if (error) {
    console.error("[listVolunteerApplications]", error)
    return { rows: [], total: 0 }
  }

  return {
    rows: (data ?? []) as VolunteerApplication[],
    total: count ?? 0,
  }
}

/** auth.users 의 provider(가입 방법) 조회. 어드민 권한 필요. */
async function getSignupProvider(userId: string | null | undefined): Promise<string | null> {
  if (!userId) return null
  const { createAdminClient } = await import("@/shared/lib/supabase/admin")
  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.getUserById(userId)
  if (error || !data?.user) return null
  // app_metadata.provider 가 OAuth provider (kakao, google, ...). 없으면 email.
  const provider = (data.user.app_metadata?.provider as string | undefined) ?? "email"
  return provider
}

export async function getAdoptionApplication(
  id: string
): Promise<(AdoptionRow & { signup_provider: string | null }) | null> {
  const { createAdminClient } = await import("@/shared/lib/supabase/admin")
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("adoption_applications")
    .select("*, dog:dogs(id, name), cat:cats(id, name)")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    console.error("[getAdoptionApplication]", error)
    return null
  }
  if (!data) return null

  const signup_provider = await getSignupProvider(
    (data as AdoptionRow).created_by
  )
  return { ...(data as AdoptionRow), signup_provider }
}

export async function getVolunteerApplication(
  id: string
): Promise<(VolunteerApplication & { signup_provider: string | null }) | null> {
  const { createAdminClient } = await import("@/shared/lib/supabase/admin")
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("volunteer_applications")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    console.error("[getVolunteerApplication]", error)
    return null
  }
  if (!data) return null

  const signup_provider = await getSignupProvider(
    (data as VolunteerApplication).created_by
  )
  return { ...(data as VolunteerApplication), signup_provider }
}

/** 회원이 본인 봉사 신청 1건을 가져옴 (수정 페이지용). 본인 소유 + 미처리 상태만 반환. */
export async function getMyEditableVolunteerApplication(
  id: string,
  userId: string
): Promise<VolunteerApplication | null> {
  const { createAdminClient } = await import("@/shared/lib/supabase/admin")
  const supabase = createAdminClient()

  const { data } = await supabase
    .from("volunteer_applications")
    .select("*")
    .eq("id", id)
    .eq("created_by", userId)
    .maybeSingle()

  if (!data) return null
  const app = data as VolunteerApplication
  // 취소 또는 반려된 신청은 수정 불가
  if (app.status === "취소" || app.status === "반려") return null
  return app
}

/** 어드민 회원 상세에서 사용: 이메일 매칭으로 회원의 신청 내역 조회 */
export async function listApplicationsByEmail(email: string): Promise<{
  adoption: AdoptionRow[]
  volunteer: VolunteerApplication[]
}> {
  if (!email) return { adoption: [], volunteer: [] }
  const { createAdminClient } = await import("@/shared/lib/supabase/admin")
  const supabase = createAdminClient()

  const [adoptionRes, volunteerRes] = await Promise.all([
    supabase
      .from("adoption_applications")
      .select("*, dog:dogs(id, name), cat:cats(id, name)")
      .ilike("email", email)
      .order("submitted_at", { ascending: false }),
    supabase
      .from("volunteer_applications")
      .select("*")
      .ilike("email", email)
      .order("submitted_at", { ascending: false }),
  ])

  return {
    adoption: (adoptionRes.data ?? []) as AdoptionRow[],
    volunteer: (volunteerRes.data ?? []) as VolunteerApplication[],
  }
}

export async function countPendingApplications(): Promise<{
  adoption: number
  volunteer: number
}> {
  const supabase = await createClient()

  const [{ count: adoption }, { count: volunteer }] = await Promise.all([
    supabase
      .from("adoption_applications")
      .select("id", { count: "exact", head: true })
      .eq("status", "접수"),
    supabase
      .from("volunteer_applications")
      .select("id", { count: "exact", head: true })
      .eq("status", "접수"),
  ])

  return { adoption: adoption ?? 0, volunteer: volunteer ?? 0 }
}

// ─────────────────────────────────────────────────────────────────────────────
// 대시보드 통계 전용 쿼리

export interface ApplicationStatusCounts {
  접수: number
  검토중: number
  승인: number
  반려: number
  취소: number
  일정변경요청: number
  total: number
}

function emptyStatusCounts(): ApplicationStatusCounts {
  return { 접수: 0, 검토중: 0, 승인: 0, 반려: 0, 취소: 0, 일정변경요청: 0, total: 0 }
}

/** 특정 테이블의 status 별 집계 + 기간 필터. */
async function aggregateByStatus(
  table: "adoption_applications" | "volunteer_applications",
  opts: { from?: string; to?: string } = {}
): Promise<ApplicationStatusCounts> {
  const supabase = await createClient()
  let q = supabase.from(table).select("status")
  const fromIso = toStartOfDayIso(opts.from)
  if (fromIso) q = q.gte("submitted_at", fromIso)
  const toIso = toEndOfDayIso(opts.to)
  if (toIso) q = q.lte("submitted_at", toIso)

  const { data, error } = await q
  if (error || !data) return emptyStatusCounts()

  const acc = emptyStatusCounts()
  for (const row of data as { status: ApplicationStatus }[]) {
    acc[row.status] = (acc[row.status] ?? 0) + 1
    acc.total += 1
  }
  return acc
}

export async function getApplicationStats(opts: {
  monthFrom: string
  monthTo: string
  prevMonthFrom: string
  prevMonthTo: string
}): Promise<{
  adoption: {
    thisMonth: number
    lastMonth: number
    allTime: ApplicationStatusCounts
  }
  volunteer: {
    thisMonth: number
    lastMonth: number
    allTime: ApplicationStatusCounts
  }
}> {
  const [
    adoptionThis,
    adoptionPrev,
    adoptionAll,
    volunteerThis,
    volunteerPrev,
    volunteerAll,
  ] = await Promise.all([
    aggregateByStatus("adoption_applications", {
      from: opts.monthFrom,
      to: opts.monthTo,
    }),
    aggregateByStatus("adoption_applications", {
      from: opts.prevMonthFrom,
      to: opts.prevMonthTo,
    }),
    aggregateByStatus("adoption_applications"),
    aggregateByStatus("volunteer_applications", {
      from: opts.monthFrom,
      to: opts.monthTo,
    }),
    aggregateByStatus("volunteer_applications", {
      from: opts.prevMonthFrom,
      to: opts.prevMonthTo,
    }),
    aggregateByStatus("volunteer_applications"),
  ])

  return {
    adoption: {
      thisMonth: adoptionThis.total,
      lastMonth: adoptionPrev.total,
      allTime: adoptionAll,
    },
    volunteer: {
      thisMonth: volunteerThis.total,
      lastMonth: volunteerPrev.total,
      allTime: volunteerAll,
    },
  }
}

export interface RecentApplication {
  id: string
  type: "adoption" | "volunteer"
  applicant_name: string
  status: ApplicationStatus
  submitted_at: string
}

export interface MonthlyVolunteerStat {
  month: string  // "YYYY-MM"
  label: string  // "1월"
  rescued: number  // 봉사 신청 수 (차트 컴포넌트와 동일 키 재사용)
}

/** 최근 N개월 봉사 신청 추이 */
export async function getMonthlyVolunteerStats(months = 6): Promise<MonthlyVolunteerStat[]> {
  const supabase = await createClient()

  const since = new Date()
  since.setMonth(since.getMonth() - months + 1)
  since.setDate(1)
  const sinceStr = `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, "0")}-01T00:00:00+09:00`

  const { data, error } = await supabase
    .from("volunteer_applications")
    .select("submitted_at")
    .gte("submitted_at", sinceStr)

  if (error || !data) return []

  const map = new Map<string, number>()
  for (const { submitted_at } of data as { submitted_at: string }[]) {
    // KST 기준 월 추출
    const d = new Date(submitted_at)
    const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000)
    const key = `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, "0")}`
    map.set(key, (map.get(key) ?? 0) + 1)
  }

  const result: MonthlyVolunteerStat[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    d.setDate(1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    result.push({ month: key, label: `${d.getMonth() + 1}월`, rescued: map.get(key) ?? 0 })
  }

  return result
}

export async function listRecentApplications(
  limit = 6
): Promise<RecentApplication[]> {
  const supabase = await createClient()
  const [adoption, volunteer] = await Promise.all([
    supabase
      .from("adoption_applications")
      .select("id, applicant_name, status, submitted_at")
      .order("submitted_at", { ascending: false })
      .limit(limit),
    supabase
      .from("volunteer_applications")
      .select("id, applicant_name, status, submitted_at")
      .order("submitted_at", { ascending: false })
      .limit(limit),
  ])

  const rows: RecentApplication[] = [
    ...((adoption.data ?? []) as Omit<RecentApplication, "type">[]).map((r) => ({
      ...r,
      type: "adoption" as const,
    })),
    ...((volunteer.data ?? []) as Omit<RecentApplication, "type">[]).map((r) => ({
      ...r,
      type: "volunteer" as const,
    })),
  ]

  return rows
    .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at))
    .slice(0, limit)
}
