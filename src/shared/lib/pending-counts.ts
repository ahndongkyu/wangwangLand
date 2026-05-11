import { createClient } from "@/shared/lib/supabase/server"

export interface PendingCounts {
  /** @deprecated 자동 승인 시스템이라 의미 없음 — 항상 0 */
  members: number
  adoptions: number      // 입양 신청 접수
  volunteers: number     // 봉사 신청 접수
  total: number
}

export async function getPendingCounts(): Promise<PendingCounts> {
  const supabase = await createClient()

  // 회원 승인 카운트 제거 — 자동 승인이라 어드민 처리 불필요
  const [adoptions, volunteers] = await Promise.all([
    supabase
      .from("adoption_applications")
      .select("id", { count: "exact", head: true })
      .eq("status", "접수"),
    supabase
      .from("volunteer_applications")
      .select("id", { count: "exact", head: true })
      .eq("status", "접수"),
  ])

  const a = adoptions.count ?? 0
  const v = volunteers.count ?? 0

  return { members: 0, adoptions: a, volunteers: v, total: a + v }
}
