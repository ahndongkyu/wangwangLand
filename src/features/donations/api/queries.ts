import { createClient } from "@/shared/lib/supabase/server"
import type { Donation, DonationStatus, DonationType } from "@/shared/types/database"

export type { Donation, DonationStatus, DonationType }

export interface ListDonationsOptions {
  status?: DonationStatus
  type?: DonationType
  limit?: number
  offset?: number
  query?: string
}

export interface PaginatedDonations {
  donations: Donation[]
  total: number
}

/** 어드민 전체 후원 목록 (모든 상태 포함) */
export async function listDonations({
  status,
  type,
  limit = 30,
  offset = 0,
  query: searchQuery,
}: ListDonationsOptions = {}): Promise<PaginatedDonations> {
  const supabase = await createClient()
  let query = supabase
    .from("donations")
    .select("*", { count: "exact" })
    .order("status", { ascending: true }) // pending 먼저
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq("status", status)
  if (type) query = query.eq("type", type)
  if (searchQuery && searchQuery.trim()) {
    query = query.ilike("donor_name", `%${searchQuery.trim()}%`)
  }

  const { data, count, error } = await query
  if (error) {
    console.error("[listDonations]", error)
    return { donations: [], total: 0 }
  }
  return { donations: (data ?? []) as Donation[], total: count ?? 0 }
}

export async function getDonation(id: string): Promise<Donation | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("donations")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error) {
    console.error("[getDonation]", error)
    return null
  }
  return data as Donation | null
}

/** 마이페이지: 본인 후원 내역 (RLS 가 자동으로 본인 것만 반환) */
export async function listMyDonations(): Promise<Donation[]> {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return []

  const { data, error } = await supabase
    .from("donations")
    .select("*")
    .eq("user_id", session.user.id)
    .order("donated_at", { ascending: false })

  if (error) {
    console.error("[listMyDonations]", error)
    return []
  }
  return (data ?? []) as Donation[]
}

/** 어드민 회원 상세에서 사용: 특정 user 의 후원 내역 */
export async function listDonationsByUser(userId: string): Promise<Donation[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("donations")
    .select("*")
    .eq("user_id", userId)
    .order("donated_at", { ascending: false })
  if (error) {
    console.error("[listDonationsByUser]", error)
    return []
  }
  return (data ?? []) as Donation[]
}

export interface DonationStats {
  approvedCashTotal: number
  approvedGoodsCount: number
  approvedCount: number
  pendingCount: number
}

/** 어드민 대시보드/페이지 헤더용 통계 */
export async function getDonationStats(): Promise<DonationStats> {
  const supabase = await createClient()

  const [{ data: cashAgg }, { count: goodsCount }, { count: approvedCount }, { count: pendingCount }] =
    await Promise.all([
      supabase
        .from("donations")
        .select("amount")
        .eq("status", "approved")
        .eq("type", "cash"),
      supabase
        .from("donations")
        .select("*", { count: "exact", head: true })
        .eq("status", "approved")
        .eq("type", "goods"),
      supabase
        .from("donations")
        .select("*", { count: "exact", head: true })
        .eq("status", "approved"),
      supabase
        .from("donations")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
    ])

  const approvedCashTotal =
    (cashAgg ?? []).reduce((sum, r) => sum + (r.amount ?? 0), 0)

  return {
    approvedCashTotal,
    approvedGoodsCount: goodsCount ?? 0,
    approvedCount: approvedCount ?? 0,
    pendingCount: pendingCount ?? 0,
  }
}
