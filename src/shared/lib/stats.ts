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
 * dogs + cats 를 합산. 집계 중 하나라도 실패하면 해당 값만 0.
 */
export async function getSiteStats(): Promise<SiteStats> {
  const supabase = await createClient()

  const [dogRes, catRes, volRes] = await Promise.all([
    supabase.from("dogs").select("status"),
    supabase.from("cats").select("status"),
    supabase
      .from("volunteer_applications")
      .select("id", { count: "exact", head: true }),
  ])

  const stats: SiteStats = {
    rescued: 0,
    adopted: 0,
    volunteers: 0,
    sheltered: 0,
  }

  const counted: { status: string }[] = []
  if (dogRes.data) counted.push(...(dogRes.data as { status: string }[]))
  if (catRes.data) counted.push(...(catRes.data as { status: string }[]))

  for (const r of counted) {
    stats.rescued += 1
    if (r.status === "입양완료") stats.adopted += 1
    if (r.status === "보호중" || r.status === "임시보호중") stats.sheltered += 1
  }

  stats.volunteers = volRes.count ?? 0

  return stats
}
