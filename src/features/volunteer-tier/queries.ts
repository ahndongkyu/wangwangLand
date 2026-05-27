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
