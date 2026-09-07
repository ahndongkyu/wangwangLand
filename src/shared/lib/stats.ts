import { createAdminClient } from "@/shared/lib/supabase/admin"

export interface SiteStats {
  /** 보호소를 거쳐간 전체 동물 수 (구조) */
  rescued: number
  /** 입양 완료된 아이 수 */
  adopted: number
  /** 누적 봉사 신청자 수 */
  volunteers: number
  /** 현재 보호 중 (대기) */
  sheltered: number
}

/**
 * 공개 센터 현황 카운터.
 * 동물 수는 count만 받고, 봉사자는 승인된 신청의 인원수 필드만 합산한다.
 */
export async function getSiteStats(): Promise<SiteStats> {
  // 신청서는 개인정보 보호를 위해 공개 SELECT가 차단되어 있으므로,
  // 서버 전용 클라이언트로 집계 결과만 계산해 공개한다.
  const supabase = createAdminClient()

  const [
    dogTotalRes,
    dogAdoptedRes,
    dogShelteredRes,
    catTotalRes,
    catAdoptedRes,
    catShelteredRes,
    volRes,
  ] = await Promise.all([
    supabase.from("dogs").select("*", { count: "exact", head: true }),
    supabase.from("dogs").select("*", { count: "exact", head: true }).eq("status", "입양완료"),
    supabase.from("dogs").select("*", { count: "exact", head: true }).in("status", ["보호중", "임시보호중"]),
    supabase.from("cats").select("*", { count: "exact", head: true }),
    supabase.from("cats").select("*", { count: "exact", head: true }).eq("status", "입양완료"),
    supabase.from("cats").select("*", { count: "exact", head: true }).in("status", ["보호중", "임시보호중"]),
    supabase.from("volunteer_applications").select("party_size").eq("status", "승인"),
  ])

  const totalVolunteers = (volRes.data ?? []).reduce((sum, r) => sum + (r.party_size ?? 1), 0)

  return {
    rescued: (dogTotalRes.count ?? 0) + (catTotalRes.count ?? 0),
    adopted: (dogAdoptedRes.count ?? 0) + (catAdoptedRes.count ?? 0),
    sheltered: (dogShelteredRes.count ?? 0) + (catShelteredRes.count ?? 0),
    volunteers: totalVolunteers,
  }
}
