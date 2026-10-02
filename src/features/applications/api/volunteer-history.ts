import { createServiceClient } from "@/shared/lib/supabase/service"
import { volunteerToday } from "../lib/volunteer-operating-hours"

export interface VolunteerCountBreakdown {
  total: number
  yearly: number
  monthly: number
}

/** 첫 희망 날짜가 지난 승인 신청 기록. 실제 참석 횟수나 등급이 아니다. */
export async function getVolunteerCountBreakdown(userId: string): Promise<VolunteerCountBreakdown> {
  const supabase = createServiceClient()
  const { data, error } = await supabase.from("volunteer_applications")
    .select("available_dates").eq("created_by", userId).eq("status", "승인")
  if (error) throw new Error("지난 승인 신청 기록을 불러오지 못했습니다.")
  const today = volunteerToday()
  const dates = (data ?? []).map(app => app.available_dates?.[0] as string | undefined)
    .filter((date): date is string => Boolean(date && date < today))
  return {
    total: dates.length,
    yearly: dates.filter(date => date >= `${today.slice(0, 4)}-01-01`).length,
    monthly: dates.filter(date => date >= `${today.slice(0, 7)}-01`).length,
  }
}
