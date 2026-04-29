"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { requireAdmin } from "@/shared/lib/auth"
import { createClient } from "@/shared/lib/supabase/server"
import {
  validateKoreanPhone,
  validateOrgOrPersonName,
} from "@/shared/lib/validation"
import type { DonationType } from "@/shared/types/database"

export interface DonationMutationResult {
  error?: string
  id?: string
}

interface DonationInput {
  type: DonationType
  donor_name: string
  phone: string
  display_name: string | null
  is_anonymous: boolean
  message: string | null
  amount: number | null
  item_description: string | null
  item_quantity: string | null
  donated_at: string
}

function parseFormData(formData: FormData): DonationInput {
  const type = (String(formData.get("type") ?? "cash") as DonationType)
  const amountRaw = String(formData.get("amount") ?? "").replace(/[^0-9]/g, "")
  const amount = amountRaw ? Number(amountRaw) : null

  return {
    type,
    donor_name: String(formData.get("donor_name") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    display_name: String(formData.get("display_name") ?? "").trim() || null,
    is_anonymous: formData.get("is_anonymous") === "on",
    message: String(formData.get("message") ?? "").trim() || null,
    amount: type === "cash" ? amount : null,
    item_description:
      type === "goods"
        ? String(formData.get("item_description") ?? "").trim() || null
        : null,
    item_quantity:
      type === "goods"
        ? String(formData.get("item_quantity") ?? "").trim() || null
        : null,
    donated_at: String(formData.get("donated_at") ?? "").trim(),
  }
}

function validate(input: DonationInput): string | null {
  const nameCheck = validateOrgOrPersonName(input.donor_name)
  if (!nameCheck.valid) return nameCheck.error ?? "이름을 확인해주세요."
  const phoneCheck = validateKoreanPhone(input.phone)
  if (!phoneCheck.valid) return phoneCheck.error ?? "연락처를 확인해주세요."
  if (!input.donated_at) return "후원 일자를 입력해주세요."
  if (input.type === "cash") {
    if (!input.amount || input.amount <= 0) return "후원 금액을 입력해주세요."
  } else {
    if (!input.item_description) return "물품명을 입력해주세요."
  }
  return null
}

export async function createDonation(
  formData: FormData
): Promise<DonationMutationResult> {
  const input = parseFormData(formData)
  const err = validate(input)
  if (err) return { error: err }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 회원이면 카카오 OAuth email 자동 저장 (폼에선 받지 않음).
  // 비회원은 email = null. 운영진은 phone 으로 연락.
  const { data, error } = await supabase
    .from("donations")
    .insert({
      ...input,
      email: user?.email ?? null,
      user_id: user?.id ?? null,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[createDonation]", error)
    return { error: error.message }
  }

  revalidatePath("/donate")
  revalidatePath("/admin/donations")
  if (user?.id) revalidatePath("/my/donations")

  redirect(`/donate/register/done?id=${data.id}`)
}

/** 어드민: 검토중 → 승인 */
export async function approveDonation(id: string): Promise<DonationMutationResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }

  const supabase = await createClient()

  const { error } = await supabase
    .from("donations")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: auth.userId,
      rejection_reason: null,
    })
    .eq("id", id)

  if (error) return { error: error.message }
  revalidatePath("/admin/donations")
  revalidatePath("/donate")
  revalidatePath("/my/donations")
  return { id }
}

/** 어드민: 검토중 → 거절 */
export async function rejectDonation(
  id: string,
  reason: string
): Promise<DonationMutationResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }

  const supabase = await createClient()

  const { error } = await supabase
    .from("donations")
    .update({
      status: "rejected",
      approved_at: null,
      approved_by: auth.userId,
      rejection_reason: reason || null,
    })
    .eq("id", id)

  if (error) return { error: error.message }
  revalidatePath("/admin/donations")
  revalidatePath("/my/donations")
  return { id }
}

/** 어드민: 승인된 건도 강제 삭제 가능 */
export async function deleteDonation(id: string): Promise<DonationMutationResult> {
  const supabase = await createClient()
  const { error } = await supabase.from("donations").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/admin/donations")
  revalidatePath("/my/donations")
  revalidatePath("/donate")
  return {}
}

/** 본인이 검토중(pending) 상태인 본인 글 취소. RLS 정책으로 다른 케이스는 자동 차단. */
export async function cancelMyPendingDonation(id: string): Promise<DonationMutationResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "로그인이 필요합니다." }

  const { error } = await supabase
    .from("donations")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "pending")

  if (error) return { error: error.message }
  revalidatePath("/my/donations")
  return {}
}
