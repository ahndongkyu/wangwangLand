import { createClient } from "@/shared/lib/supabase/server"
import { recentMonthWindows } from "@/shared/lib/month-windows"
import type {
  AdoptionApplication,
  ApplicationStatus,
  VolunteerApplication,
} from "@/shared/types/database"

export interface AdoptionRow extends AdoptionApplication {
  dog?: { id: string; name: string } | null
  cat?: { id: string; name: string } | null
}

export interface MyApplicationSummary {
  approved: number
  pending: number
}

interface ListOptions {
  status?: ApplicationStatus | "전체"
  /** 신청자/단체 이름·전화 통합 검색 (ilike) */
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
    query = query.or(
      `applicant_name.ilike.${q},group_name.ilike.${q},phone.ilike.${q}`
    )
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
): Promise<
  | (VolunteerApplication & {
      signup_provider: string | null
      approved_by_profile: { nickname: string; role: string } | null
    })
  | null
> {
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
  const application = data as VolunteerApplication
  let approved_by_profile: { nickname: string; role: string } | null = null
  if (application.approved_by) {
    const { data: approver } = await supabase
      .from("profiles")
      .select("nickname, role")
      .eq("id", application.approved_by)
      .maybeSingle()
    approved_by_profile = approver
      ? { nickname: approver.nickname, role: approver.role }
      : null
  }

  return { ...application, signup_provider, approved_by_profile }
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

/** 모바일 회원 메뉴에 표시할 본인 신청 상태 요약. */
export async function getMyApplicationSummary(
  userId: string
): Promise<MyApplicationSummary> {
  const { createAdminClient } = await import("@/shared/lib/supabase/admin")
  const admin = createAdminClient()

  const [adoptionRes, volunteerRes] = await Promise.all([
    admin
      .from("adoption_applications")
      .select("status")
      .eq("created_by", userId)
      .neq("status", "반려")
      .neq("status", "취소"),
    admin
      .from("volunteer_applications")
      .select("status")
      .eq("created_by", userId)
      .neq("status", "반려")
      .neq("status", "취소"),
  ])

  const statuses = [
    ...(adoptionRes.data ?? []),
    ...(volunteerRes.data ?? []),
  ].map(({ status }) => status as ApplicationStatus)

  return statuses.reduce<MyApplicationSummary>(
    (summary, status) => {
      if (status === "승인") summary.approved += 1
      else summary.pending += 1
      return summary
    },
    { approved: 0, pending: 0 }
  )
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
  const fromIso = toStartOfDayIso(opts.from)
  const toIso = toEndOfDayIso(opts.to)
  const acc = emptyStatusCounts()
  const statuses: ApplicationStatus[] = ["접수", "검토중", "승인", "반려", "취소", "일정변경요청"]
  await Promise.all(statuses.map(async (status) => {
    let q = supabase.from(table).select("id", { count: "exact", head: true }).eq("status", status)
    if (fromIso) q = q.gte("submitted_at", fromIso)
    if (toIso) q = q.lte("submitted_at", toIso)
    const { count, error } = await q
    if (error) throw new Error("신청 통계를 불러오지 못했습니다.", { cause: error })
    acc[status] = count ?? 0
  }))
  acc.total = statuses.reduce((sum, status) => sum + acc[status], 0)
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
  group_name: string | null
  status: ApplicationStatus
  submitted_at: string
}

export interface MonthlyVolunteerStat {
  month: string  // "YYYY-MM"
  label: string  // "1월"
  rescued: number  // 봉사 신청 수 (차트 컴포넌트와 동일 키 재사용)
}

/** 승인된 신청의 동반 인원 합계. 실제 참석이나 고유 봉사자 수와는 다르다. */
export async function getApprovedVolunteerPeople(): Promise<number> {
  const supabase = await createClient()
  let total = 0
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from("volunteer_applications")
      .select("id, party_size").eq("status", "승인")
      .order("id", { ascending: true }).range(offset, offset + 499)
    if (error) throw new Error("승인 인원을 불러오지 못했습니다.", { cause: error })
    for (const row of data ?? []) total += row.party_size ?? 0
    if (!data || data.length < 500) break
  }
  return total
}

/** 최근 N개월 봉사 신청 추이 */
export async function getMonthlyVolunteerStats(months = 6): Promise<MonthlyVolunteerStat[]> {
  const supabase = await createClient()
  return Promise.all(recentMonthWindows(months).map(async (window) => {
    const { count, error } = await supabase.from("volunteer_applications")
      .select("id", { count: "exact", head: true })
      .gte("submitted_at", window.from).lt("submitted_at", window.to)
    if (error) throw new Error("월별 통계를 불러오지 못했습니다.", { cause: error })
    return { month: window.month, label: window.label, rescued: count ?? 0 }
  }))
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
      .select("id, applicant_name, group_name, status, submitted_at")
      .order("submitted_at", { ascending: false })
      .limit(limit),
  ])

  const rows: RecentApplication[] = [
    ...((adoption.data ?? []) as Omit<
      RecentApplication,
      "type" | "group_name"
    >[]).map((r) => ({
      ...r,
      group_name: null,
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
