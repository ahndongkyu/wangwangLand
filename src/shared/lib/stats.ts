import { createAdminClient } from "@/shared/lib/supabase/admin"
import { sumApprovedVolunteerPeople } from "./volunteer-stats"

export interface SiteStats {
  /** 입양 완료된 아이 수 */
  adopted: number | null
  /** 누적 봉사 신청자 수 */
  volunteers: number | null
}

/**
 * 공개 센터 현황 카운터.
 * 동물 수는 count만 받고, 봉사자는 승인된 신청의 인원수 필드만 합산한다.
 */
export async function getSiteStats(): Promise<SiteStats> {
  // 신청서는 개인정보 보호를 위해 공개 SELECT가 차단되어 있으므로,
  // 서버 전용 클라이언트로 집계 결과만 계산해 공개한다.
  const supabase = createAdminClient()

  const [dogAdoptedRes, catAdoptedRes, volRes] = await Promise.all([
    supabase.from("dogs").select("*", { count: "exact", head: true }).eq("status", "입양완료"),
    supabase.from("cats").select("*", { count: "exact", head: true }).eq("status", "입양완료"),
    sumApprovedVolunteerPeople().catch(() => null),
  ])

  return {
    adopted: dogAdoptedRes.error || catAdoptedRes.error || dogAdoptedRes.count === null || catAdoptedRes.count === null
      ? null : dogAdoptedRes.count + catAdoptedRes.count,
    volunteers: volRes,
  }
}
