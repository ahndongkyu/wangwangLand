import { createClient } from "@/shared/lib/supabase/server"
import type { DonationThanks } from "../types"

export interface ListThanksOptions {
  query?: string
  limit?: number
  offset?: number
  /** true 면 임시저장까지 전부 반환 (어드민용). public 페이지에서는 false. */
  includeDrafts?: boolean
}

export interface PaginatedThanks {
  rows: DonationThanks[]
  total: number
}

export async function listDonationThanks({
  query: searchQuery,
  limit = 20,
  offset = 0,
  includeDrafts = false,
}: ListThanksOptions = {}): Promise<PaginatedThanks> {
  const supabase = await createClient()
  let q = supabase
    .from("donation_thanks")
    .select("*", { count: "exact" })

  if (includeDrafts) {
    q = q.order("created_at", { ascending: false })
  } else {
    q = q
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
  }

  q = q.range(offset, offset + limit - 1)

  if (searchQuery && searchQuery.trim()) {
    q = q.ilike("title", `%${searchQuery.trim()}%`)
  }

  const { data, count, error } = await q
  if (error) {
    console.error("[listDonationThanks]", error)
    return { rows: [], total: 0 }
  }
  return {
    rows: (data ?? []) as DonationThanks[],
    total: count ?? 0,
  }
}

/** /donate 페이지 캐러셀용 — 발행된 최근 N건 */
export async function listRecentDonationThanks(
  limit = 6
): Promise<DonationThanks[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("donation_thanks")
    .select("*")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(limit)
  return (data ?? []) as DonationThanks[]
}

export async function getDonationThanks(id: string): Promise<DonationThanks | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("donation_thanks")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  return data as DonationThanks | null
}

export async function countDonationThanks(): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from("donation_thanks")
    .select("id", { count: "exact", head: true })
  return count ?? 0
}
