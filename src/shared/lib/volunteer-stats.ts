import "server-only"
import { createAdminClient } from "@/shared/lib/supabase/admin"

/** 승인 신청의 인원 합계. 승인 이력이 있는 일정변경 요청은 포함하고 취소·반려는 제외한다. */
export async function sumApprovedVolunteerPeople(): Promise<number> {
  const client = createAdminClient()
  let total = 0
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client.from("volunteer_applications")
      .select("id, party_size")
      .or("status.eq.승인,and(status.eq.일정변경요청,approved_at.not.is.null)")
      .order("id", { ascending: true }).range(offset, offset + 499)
    if (error) throw new Error("승인 인원을 불러오지 못했습니다.", { cause: error })
    for (const row of data ?? []) total += row.party_size ?? 1
    if (!data || data.length < 500) return total
  }
}
