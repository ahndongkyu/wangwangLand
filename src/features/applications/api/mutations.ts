"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/shared/lib/supabase/server"
import {
  validateKoreanPhone,
  validateName,
  validatePartySize,
} from "@/shared/lib/validation"
import type {
  ApplicationStatus,
  HousingType,
  OwnershipType,
  VolunteerActivity,
} from "@/shared/types/database"

export interface SubmitResult {
  error?: string
  id?: string
}

export async function submitAdoptionApplication(
  formData: FormData
): Promise<SubmitResult> {
  const dogId = String(formData.get("dog_id") ?? "").trim()
  const applicant_name = String(formData.get("applicant_name") ?? "").trim()
  const phone = String(formData.get("phone") ?? "").trim()
  const email = String(formData.get("email") ?? "").trim()
  const address = String(formData.get("address") ?? "").trim()
  const reason = String(formData.get("reason") ?? "").trim()
  const privacy_agreed = formData.get("privacy_agreed") === "on"

  if (!applicant_name || !phone || !email || !address || !reason) {
    return { error: "필수 항목을 모두 입력해주세요." }
  }
  if (!privacy_agreed) {
    return { error: "개인정보 수집·이용 동의가 필요합니다." }
  }

  const familySizeStr = String(formData.get("family_size") ?? "")
  const housingType = String(formData.get("housing_type") ?? "") as HousingType | ""
  const ownershipType = String(formData.get("ownership_type") ?? "") as OwnershipType | ""

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("adoption_applications")
    .insert({
      dog_id: dogId || null,
      applicant_name,
      phone,
      email,
      address,
      reason,
      family_size: familySizeStr ? Number(familySizeStr) : null,
      has_children: formData.get("has_children") === "on",
      housing_type: housingType || null,
      ownership_type: ownershipType || null,
      current_pets: String(formData.get("current_pets") ?? "").trim() || null,
      past_pet_experience:
        String(formData.get("past_pet_experience") ?? "").trim() || null,
      privacy_agreed: true,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[submitAdoptionApplication]", error)
    return { error: "신청 접수 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." }
  }

  return { id: data.id }
}

export async function submitVolunteerApplication(
  formData: FormData
): Promise<SubmitResult> {
  const applicant_name = String(formData.get("applicant_name") ?? "").trim()
  const phone = String(formData.get("phone") ?? "").trim()
  const privacy_agreed = formData.get("privacy_agreed") === "on"

  const nameCheck = validateName(applicant_name)
  if (!nameCheck.valid) return { error: nameCheck.error }

  const phoneCheck = validateKoreanPhone(phone)
  if (!phoneCheck.valid) return { error: phoneCheck.error }

  const partyCheck = validatePartySize(
    String(formData.get("party_size") ?? "1")
  )
  if (!partyCheck.valid) return { error: partyCheck.error }

  if (!privacy_agreed) {
    return { error: "개인정보 수집·이용 동의가 필요합니다." }
  }

  const availableDays = formData.getAll("available_days").map(String)
  const activities = formData.getAll("activities").map(String) as VolunteerActivity[]

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("volunteer_applications")
    .insert({
      applicant_name,
      phone,
      party_size: partyCheck.partySize!,
      available_days: availableDays,
      available_time: String(formData.get("available_time") ?? "").trim() || null,
      activities,
      message: String(formData.get("message") ?? "").trim() || null,
      privacy_agreed: true,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[submitVolunteerApplication]", error)
    return { error: "신청 접수 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." }
  }

  return { id: data.id }
}

// ============================================================================
// 어드민용 처리 액션
// ============================================================================

function revalidateAdminApplications() {
  revalidatePath("/admin/applications")
  revalidatePath("/admin")
}

export async function updateAdoptionApplication(
  id: string,
  formData: FormData
): Promise<SubmitResult> {
  const status = String(formData.get("status") ?? "") as ApplicationStatus
  const adminNote = String(formData.get("admin_note") ?? "").trim()

  const supabase = await createClient()
  const { error } = await supabase
    .from("adoption_applications")
    .update({ status, admin_note: adminNote || null })
    .eq("id", id)

  if (error) {
    console.error("[updateAdoptionApplication]", error)
    return { error: error.message }
  }

  revalidateAdminApplications()
  revalidatePath(`/admin/applications/adoption/${id}`)
  return { id }
}

export async function updateVolunteerApplication(
  id: string,
  formData: FormData
): Promise<SubmitResult> {
  const status = String(formData.get("status") ?? "") as ApplicationStatus
  const adminNote = String(formData.get("admin_note") ?? "").trim()

  const supabase = await createClient()
  const { error } = await supabase
    .from("volunteer_applications")
    .update({ status, admin_note: adminNote || null })
    .eq("id", id)

  if (error) {
    console.error("[updateVolunteerApplication]", error)
    return { error: error.message }
  }

  revalidateAdminApplications()
  revalidatePath(`/admin/applications/volunteer/${id}`)
  return { id }
}

export async function deleteAdoptionApplication(
  id: string
): Promise<SubmitResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("adoption_applications")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("[deleteAdoptionApplication]", error)
    return { error: error.message }
  }

  revalidateAdminApplications()
  return {}
}

export async function deleteVolunteerApplication(
  id: string
): Promise<SubmitResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("volunteer_applications")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("[deleteVolunteerApplication]", error)
    return { error: error.message }
  }

  revalidateAdminApplications()
  return {}
}
