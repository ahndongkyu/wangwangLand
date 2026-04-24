import { createClient } from "@/shared/lib/supabase/server"

export interface PendingCounts {
  members: number        // 회원 승인 대기
  adoptions: number      // 입양 신청 접수
  volunteers: number     // 봉사 신청 접수
  total: number
}

export async function getPendingCounts(): Promise<PendingCounts> {
  const supabase = await createClient()

  const [members, adoptions, volunteers] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("adoption_applications")
      .select("id", { count: "exact", head: true })
      .eq("status", "접수"),
    supabase
      .from("volunteer_applications")
      .select("id", { count: "exact", head: true })
      .eq("status", "접수"),
  ])

  const m = members.count ?? 0
  const a = adoptions.count ?? 0
  const v = volunteers.count ?? 0

  return { members: m, adoptions: a, volunteers: v, total: m + a + v }
}
