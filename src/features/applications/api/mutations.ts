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

  const availableDates = formData.getAll("available_dates").map(String)
  // available_days(요일) 는 폼에서 제거됐지만 컬럼은 유지(legacy). 빈 배열로 저장.
  const availableDays: string[] = []
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
      available_dates: availableDates,
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
      type: notificationTypeForStatus(status),
      post_type: "adoption",
      post_id: id,
      actor_id: null,
    })
  }

  revalidateAdminApplications()
  revalidatePath(`/admin/applications/adoption/${id}`)
  return { id }
}

function notificationTypeForStatus(status: ApplicationStatus): string {
  switch (status) {
    case "승인":
      return "application_approved"
    case "반려":
      return "application_rejected"
    case "검토중":
      return "application_under_review"
    default:
      return "application_status_changed"
  }
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
      "id, applicant_name, party_size, activities, available_dates, available_time, message, created_by, status"
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
      type: notificationTypeForStatus(status),
      post_type: "volunteer",
      post_id: id,
      actor_id: null,
    })
  }

  // 승인 시 캘린더 자동 등록 (또는 기존 이벤트 시간 수정)
  if (status === "승인" && prev) {
    const linkedEventId =
      String(formData.get("linked_event_id") ?? "").trim() || null
    await upsertVolunteerEventForApplication({
      applicationId: id,
      applicantName: prev.applicant_name,
      partySize: prev.party_size ?? 1,
      activities: (prev.activities ?? []) as string[],
      availableTime: prev.available_time ?? null,
      message: prev.message ?? null,
      scheduledStart,
      scheduledEnd,
      linkedEventId,
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
  /** status form 으로 들어왔을 때, 수정 대상 이벤트의 id. 없으면 새로 insert. */
  linkedEventId?: string | null
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
    linkedEventId,
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

  // 다중 날짜 등록을 지원하므로 같은 신청에 여러 이벤트가 있을 수 있음.
  // status form 에서 명시된 linkedEventId 가 있으면 그 행을 update, 없으면 새로 insert.
  let existing: { id: string } | null = null
  if (linkedEventId) {
    const { data } = await admin
      .from("events")
      .select("id")
      .eq("id", linkedEventId)
      .maybeSingle()
    existing = data ?? null
  }

  const payload = {
    category: "volunteer" as const,
    title,
    description: description || null,
    starts_at: starts.toISOString(),
    ends_at: ends.toISOString(),
    all_day: false,
    signup_enabled: false,
    // 공개 캘린더에도 노출 (이름은 표시 시 자동 마스킹)
    visibility: "public" as const,
    source_application_type: "volunteer" as const,
    source_application_id: applicationId,
  }

  if (existing) {
    await admin.from("events").update(payload).eq("id", existing.id)
  } else {
    const { error: insertErr } = await admin.from("events").insert(payload)
    // race: 다른 어드민이 동시에 등록한 경우 unique 제약(23505)에 걸리면 그 행을 update.
    if (
      insertErr &&
      (insertErr.code === "23505" || /duplicate key/i.test(insertErr.message))
    ) {
      const { data: dup } = await admin
        .from("events")
        .select("id")
        .eq("source_application_type", "volunteer")
        .eq("source_application_id", applicationId)
        .maybeSingle()
      if (dup) await admin.from("events").update(payload).eq("id", dup.id)
    } else if (insertErr) {
      console.error("[upsertVolunteerEventForApplication] insert", insertErr)
    }
  }
}

export async function deleteAdoptionApplication(
  id: string
): Promise<SubmitResult> {
  const admin = createAdminClient()

  // 연결된 캘린더 일정 cascade 삭제 (입양은 보통 자동 등록이 없지만 정합성 위해).
  await admin
    .from("events")
    .delete()
    .eq("source_application_type", "adoption")
    .eq("source_application_id", id)

  const { error } = await admin
    .from("adoption_applications")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("[deleteAdoptionApplication]", error)
    return { error: error.message }
  }

  revalidateAdminApplications()
  revalidatePath("/admin/calendar")
  revalidatePath("/calendar")
  redirect("/admin/applications")
}

export async function deleteVolunteerApplication(
  id: string
): Promise<SubmitResult> {
  const admin = createAdminClient()

  // 캘린더에 연결된 자동 등록 일정 cascade 삭제.
  // 신청자에게는 deleteVolunteerApplicationByOwner 에서 별도 알림 처리 (운영진 삭제 시 알림 X).
  await admin
    .from("events")
    .delete()
    .eq("source_application_type", "volunteer")
    .eq("source_application_id", id)

  const { error } = await admin
    .from("volunteer_applications")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("[deleteVolunteerApplication]", error)
    return { error: error.message }
  }

  revalidateAdminApplications()
  revalidatePath("/admin/calendar")
  revalidatePath("/calendar")
  redirect("/admin/applications")
}

/**
 * 회원이 본인 봉사 신청을 직접 삭제 (취소 + 행 제거).
 * 연결된 캘린더 일정도 함께 cascade 삭제.
 */
export async function cancelOwnVolunteerApplication(
  id: string
): Promise<SubmitResult> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) return { error: "로그인이 필요합니다." }

  const admin = createAdminClient()

  // 본인 소유 확인 (RLS 우회 admin client 라 명시적 체크 필수)
  const { data: app } = await admin
    .from("volunteer_applications")
    .select("created_by")
    .eq("id", id)
    .maybeSingle()
  if (!app) return { error: "신청을 찾을 수 없습니다." }
  if (app.created_by !== session.user.id) {
    return { error: "본인 신청만 삭제할 수 있습니다." }
  }

  // 연결 캘린더 일정 cascade 삭제
  await admin
    .from("events")
    .delete()
    .eq("source_application_type", "volunteer")
    .eq("source_application_id", id)

  const { error } = await admin
    .from("volunteer_applications")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("[cancelOwnVolunteerApplication]", error)
    return { error: error.message }
  }

  revalidatePath("/my/applications")
  revalidatePath("/calendar")
  revalidatePath("/admin/applications")
  revalidatePath("/admin/calendar")
  return { id }
}

/**
 * 회원이 본인 입양 신청을 직접 삭제.
 */
export async function cancelOwnAdoptionApplication(
  id: string
): Promise<SubmitResult> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) return { error: "로그인이 필요합니다." }

  const admin = createAdminClient()

  const { data: app } = await admin
    .from("adoption_applications")
    .select("created_by")
    .eq("id", id)
    .maybeSingle()
  if (!app) return { error: "신청을 찾을 수 없습니다." }
  if (app.created_by !== session.user.id) {
    return { error: "본인 신청만 삭제할 수 있습니다." }
  }

  await admin
    .from("events")
    .delete()
    .eq("source_application_type", "adoption")
    .eq("source_application_id", id)

  const { error } = await admin
    .from("adoption_applications")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("[cancelOwnAdoptionApplication]", error)
    return { error: error.message }
  }

  revalidatePath("/my/applications")
  revalidatePath("/admin/applications")
  return { id }
}
