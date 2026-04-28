"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { createClient } from "@/shared/lib/supabase/server"
import { createAdminClient } from "@/shared/lib/supabase/admin"
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
  const address = String(formData.get("address") ?? "").trim()
  const reason = String(formData.get("reason") ?? "").trim()
  const privacy_agreed = formData.get("privacy_agreed") === "on"

  const nameCheck = validateName(applicant_name)
  if (!nameCheck.valid) return { error: nameCheck.error }

  const phoneCheck = validateKoreanPhone(phone)
  if (!phoneCheck.valid) return { error: phoneCheck.error }

  if (address.length < 5) {
    return { error: "주소는 최소 시/도까지 입력해주세요." }
  }
  if (reason.length < 10) {
    return { error: "입양을 결심하신 이유를 10자 이상 적어주세요." }
  }
  if (!privacy_agreed) {
    return { error: "개인정보 수집·이용 동의가 필요합니다." }
  }

  const familySizeStr = String(formData.get("family_size") ?? "")
  const housingType = String(formData.get("housing_type") ?? "") as HousingType | ""
  const ownershipType = String(formData.get("ownership_type") ?? "") as OwnershipType | ""

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user

  // 비회원도 INSERT 가능하지만, RLS 의 SELECT 정책은 운영진만 허용.
  // 따라서 .select() returning 시 RLS 차단 → admin client(service role)로 우회.
  const { createAdminClient } = await import("@/shared/lib/supabase/admin")
  const admin = createAdminClient()

  const { data, error } = await admin
    .from("adoption_applications")
    .insert({
      dog_id: dogId || null,
      applicant_name,
      phone,
      // 회원이면 카카오 이메일 자동 저장. 비회원은 null.
      email: user?.email ?? null,
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
      created_by: user?.id ?? null,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[submitAdoptionApplication]", error)
    return { error: `신청 실패: ${error.message}` }
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
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user

  // 비회원도 INSERT 가능하지만 SELECT 는 운영진만. .select() returning 위해 admin client.
  const { createAdminClient } = await import("@/shared/lib/supabase/admin")
  const admin = createAdminClient()

  const { data, error } = await admin
    .from("volunteer_applications")
    .insert({
      applicant_name,
      phone,
      // 회원이면 카카오 이메일 자동 저장. 비회원은 null.
      email: user?.email ?? null,
      party_size: partyCheck.partySize!,
      available_days: availableDays,
      available_time: String(formData.get("available_time") ?? "").trim() || null,
      activities,
      message: String(formData.get("message") ?? "").trim() || null,
      privacy_agreed: true,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[submitVolunteerApplication]", error)
    return { error: `신청 실패: ${error.message}` }
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

  // 상태 변경 전 created_by 조회
  const { data: prev } = await supabase
    .from("adoption_applications")
    .select("created_by, status")
    .eq("id", id)
    .maybeSingle()

  const { error } = await supabase
    .from("adoption_applications")
    .update({ status, admin_note: adminNote || null })
    .eq("id", id)

  if (error) {
    console.error("[updateAdoptionApplication]", error)
    return { error: error.message }
  }

  // 상태가 실제로 바뀌었고, created_by가 있으면 유저에게 알림 발송
  if (prev?.created_by && prev.status !== status) {
    const admin = createAdminClient()
    await admin.from("notifications").insert({
      user_id: prev.created_by,
      type: "application_status_changed",
      post_type: "adoption",
      post_id: id,
      actor_id: null,
    })
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

  // 승인일 때만 캘린더 등록용 일시
  const scheduledStart = String(formData.get("scheduled_starts_at") ?? "")
  const scheduledEnd = String(formData.get("scheduled_ends_at") ?? "")

  const supabase = await createClient()

  // 상태 변경 전 신청 정보 조회 (캘린더 칩 제목용 + created_by)
  const { data: prev } = await supabase
    .from("volunteer_applications")
    .select(
      "id, applicant_name, party_size, activities, available_time, message, created_by, status"
    )
    .eq("id", id)
    .maybeSingle()

  const { error } = await supabase
    .from("volunteer_applications")
    .update({ status, admin_note: adminNote || null })
    .eq("id", id)

  if (error) {
    console.error("[updateVolunteerApplication]", error)
    return { error: error.message }
  }

  // 상태가 실제로 바뀌었고, created_by가 있으면 유저에게 알림 발송
  if (prev?.created_by && prev.status !== status) {
    const admin = createAdminClient()
    await admin.from("notifications").insert({
      user_id: prev.created_by,
      type: "application_status_changed",
      post_type: "volunteer",
      post_id: id,
      actor_id: null,
    })
  }

  // 승인 시 캘린더 자동 등록 (운영진 전용 internal 이벤트)
  if (status === "승인" && prev) {
    await upsertVolunteerEventForApplication({
      applicationId: id,
      applicantName: prev.applicant_name,
      partySize: prev.party_size ?? 1,
      activities: (prev.activities ?? []) as string[],
      availableTime: prev.available_time ?? null,
      message: prev.message ?? null,
      scheduledStart,
      scheduledEnd,
    })
  }

  revalidateAdminApplications()
  revalidatePath(`/admin/applications/volunteer/${id}`)
  revalidatePath("/admin/calendar")
  return { id }
}

/**
 * 봉사 신청 → 캘린더 internal 이벤트 upsert.
 * 같은 신청 id 의 이벤트가 이미 있으면 update, 없으면 insert.
 */
async function upsertVolunteerEventForApplication(opts: {
  applicationId: string
  applicantName: string
  partySize: number
  activities: string[]
  availableTime: string | null
  message: string | null
  scheduledStart: string  // datetime-local 또는 빈 값
  scheduledEnd: string
}) {
  const {
    applicationId,
    applicantName,
    partySize,
    activities,
    availableTime,
    message,
    scheduledStart,
    scheduledEnd,
  } = opts

  // 일시가 비었으면 등록 스킵 (운영진이 수기 입력 안 한 경우).
  if (!scheduledStart || !scheduledEnd) return

  // datetime-local 은 timezone 이 없으니 KST(+09:00) 로 강제 해석.
  const starts = new Date(`${scheduledStart}:00+09:00`)
  const ends = new Date(`${scheduledEnd}:00+09:00`)
  if (
    Number.isNaN(starts.getTime()) ||
    Number.isNaN(ends.getTime()) ||
    ends < starts
  ) {
    return
  }

  const title =
    partySize > 1
      ? `${applicantName} 외 ${partySize - 1}명`
      : applicantName

  const description = [
    activities.length > 0 ? `희망 활동: ${activities.join(", ")}` : null,
    availableTime ? `요청 시간대: ${availableTime}` : null,
    message ? `메모: ${message}` : null,
  ]
    .filter(Boolean)
    .join("\n")

  const admin = createAdminClient()

  const { data: existing } = await admin
    .from("events")
    .select("id")
    .eq("source_application_type", "volunteer")
    .eq("source_application_id", applicationId)
    .maybeSingle()

  const payload = {
    category: "volunteer" as const,
    title,
    description: description || null,
    starts_at: starts.toISOString(),
    ends_at: ends.toISOString(),
    all_day: false,
    signup_enabled: false,
    visibility: "internal" as const,
    source_application_type: "volunteer" as const,
    source_application_id: applicationId,
  }

  if (existing) {
    await admin.from("events").update(payload).eq("id", existing.id)
  } else {
    await admin.from("events").insert(payload)
  }
}

export async function deleteAdoptionApplication(
  id: string
): Promise<SubmitResult> {
  const admin = createAdminClient()
  const { error } = await admin
    .from("adoption_applications")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("[deleteAdoptionApplication]", error)
    return { error: error.message }
  }

  revalidateAdminApplications()
  redirect("/admin/applications")
}

export async function deleteVolunteerApplication(
  id: string
): Promise<SubmitResult> {
  const admin = createAdminClient()
  const { error } = await admin
    .from("volunteer_applications")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("[deleteVolunteerApplication]", error)
    return { error: error.message }
  }

  revalidateAdminApplications()
  redirect("/admin/applications")
}
