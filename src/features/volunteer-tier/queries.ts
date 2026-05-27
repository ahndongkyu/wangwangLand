import { createServiceClient } from "@/shared/lib/supabase/service"

export interface VolunteerCountBreakdown {
  total: number
  yearly: number
  monthly: number
}

// date 문자열 ("2026-05-04") → 로컬 자정 Date (타임존 오류 방지)
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d)
}

/**
 * 봉사 횟수 계산 기준:
 * 승인된 신청의 available_dates[0] 이 오늘보다 이전이면 1회 인정.
 * (봉사일 다음 날부터 카운트)
 */
function countApps(
  apps: { available_dates: string[] }[],
  before: Date,
  from?: Date
): number {
  return apps.filter(({ available_dates: dates }) => {
    if (!dates || dates.length === 0) return false
    const volunteerDate = parseLocalDate(dates[0])
    if (volunteerDate >= before) return false   // 아직 봉사일 안 지남
    if (from && volunteerDate < from) return false
    return true
  }).length
}

/** 사용자의 봉사 인증 횟수 */
export async function getVolunteerCount(userId: string): Promise<number> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from("volunteer_applications")
    .select("available_dates")
    .eq("created_by", userId)
    .eq("status", "승인")

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return countApps((data ?? []) as { available_dates: string[] }[], today)
}

/** 총 / 올해 / 이번 달 봉사 횟수 한 번에 조회 */
export async function getVolunteerCountBreakdown(
  userId: string
): Promise<VolunteerCountBreakdown> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from("volunteer_applications")
    .select("available_dates")
    .eq("created_by", userId)
    .eq("status", "승인")

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yearStart = new Date(now.getFullYear(), 0, 1)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const apps = (data ?? []) as { available_dates: string[] }[]

  return {
    total:   countApps(apps, today),
    yearly:  countApps(apps, today, yearStart),
    monthly: countApps(apps, today, monthStart),
  }
}

export interface RankedVolunteer {
  userId: string
  nickname: string
  phone?: string | null
  role: string
  count: number
  rank: number
}

/**
 * 전체 봉사 랭킹 (내림차순).
 * 어드민/메인 공용 — 마스킹은 호출하는 쪽에서 처리.
 */
export async function getVolunteerRanking(): Promise<RankedVolunteer[]> {
  const supabase = createServiceClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data: apps } = await supabase
    .from("volunteer_applications")
    .select("created_by, available_dates")
    .eq("status", "승인")

  // 유저별 카운트 집계
  const countMap: Record<string, number> = {}
  for (const app of (apps ?? []) as { created_by: string; available_dates: string[] }[]) {
    if (!app.created_by) continue
    const dates = app.available_dates
    if (!dates || dates.length === 0) continue
    const volunteerDate = parseLocalDate(dates[0])
    if (volunteerDate < today) {
      countMap[app.created_by] = (countMap[app.created_by] ?? 0) + 1
    }
  }

  const userIds = Object.keys(countMap)
  if (userIds.length === 0) return []

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, nickname, role, phone")
    .in("id", userIds)
    .not("role", "in", '("staff","admin")') // 운영진 제외

  return (profiles ?? [])
    .map((p) => ({
      userId: p.id,
      nickname: p.nickname,
      phone: p.phone as string | null,
      role: p.role as string,
      count: countMap[p.id] ?? 0,
    }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .map((r, i) => ({ ...r, rank: i + 1 }))
}

/** 여러 사용자의 카운트 한 번에 조회 (목록 페이지 등급 뱃지용) */
export async function getVolunteerCountMap(
  userIds: string[]
): Promise<Record<string, number>> {
  if (userIds.length === 0) return {}

  const supabase = createServiceClient()
  const { data } = await supabase
    .from("volunteer_applications")
    .select("created_by, available_dates")
    .eq("status", "승인")
    .in("created_by", userIds)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const map: Record<string, number> = {}
  for (const id of userIds) map[id] = 0

  for (const app of (data ?? []) as { created_by: string; available_dates: string[] }[]) {
    const dates = app.available_dates
    if (!dates || dates.length === 0) continue
    const volunteerDate = parseLocalDate(dates[0])
    if (volunteerDate < today) {
      map[app.created_by] = (map[app.created_by] ?? 0) + 1
    }
  }

  return map
}
