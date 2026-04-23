import { createClient } from "@/shared/lib/supabase/server"

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
 * 푸터 · 메인 실적 카운터 공용.
 * head:true 로 데이터 row 없이 count 만 수신 — 전체 스캔 없음.
 */
export async function getSiteStats(): Promise<SiteStats> {
  const supabase = await createClient()

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
    supabase.from("volunteer_applications").select("*", { count: "exact", head: true }),
  ])

  return {
    rescued: (dogTotalRes.count ?? 0) + (catTotalRes.count ?? 0),
    adopted: (dogAdoptedRes.count ?? 0) + (catAdoptedRes.count ?? 0),
    sheltered: (dogShelteredRes.count ?? 0) + (catShelteredRes.count ?? 0),
    volunteers: volRes.count ?? 0,
  }
}
