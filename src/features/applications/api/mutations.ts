"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { createClient } from "@/shared/lib/supabase/server"
import { createAdminClient } from "@/shared/lib/supabase/admin"
import { requireAdmin } from "@/shared/lib/auth"
import { localKstToIso, dateKey } from "@/features/events/lib/date"
import {
  GROUP_BLOCK_THRESHOLD,
  GROUP_BLOCKING_CATEGORIES,
} from "@/features/events/types"
import {
  formatKoreanPhone,
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
  const phone = formatKoreanPhone(String(formData.get("phone") ?? "").trim())
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

  // 운영진에게 푸시 알림
  try {
    const { sendPushToStaff } = await import("@/features/push")
    await sendPushToStaff({
      title: "💕 새 입양 신청",
      body: `${applicant_name}님이 입양을 신청했어요`,
      url: `/admin/applications/adoption/${data.id}`,
      tag: `adoption-app-${data.id}`,
    })
  } catch (e) {
    console.error("[push adoption-app]", e)
  }

  return { id: data.id }
}

export async function submitVolunteerApplication(
  formData: FormData
): Promise<SubmitResult> {
  const applicant_name = String(formData.get("applicant_name") ?? "").trim()
  const phone = formatKoreanPhone(String(formData.get("phone") ?? "").trim())
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

  // 봉사 신청은 회원만 가능
  if (!user) return { error: "로그인 후 신청해주세요." }

  // 회원 상태 확인 (승인된 회원만)
  const { data: profile } = await supabase
    .from("profiles")
    .select("status, is_banned")
    .eq("id", user.id)
    .maybeSingle()
  if (!profile || profile.status !== "approved" || profile.is_banned) {
    return { error: "봉사 신청 가능한 회원 상태가 아닙니다." }
  }

  // SELECT 는 운영진만 RLS 허용이므로 admin client 로 우회
  const { createAdminClient } = await import("@/shared/lib/supabase/admin")
  const admin = createAdminClient()

  // 정기봉사가 있는 날엔 단체(5명 이상) 봉사 신청 불가
  if ((partyCheck.partySize ?? 1) >= GROUP_BLOCK_THRESHOLD && availableDates.length > 0) {
    const sorted = [...availableDates].sort()
    const fromIso = new Date(`${sorted[0]}T00:00:00+09:00`).toISOString()
    const toIso = new Date(`${sorted[sorted.length - 1]}T23:59:59+09:00`).toISOString()
    const { data: regEvents } = await admin
      .from("events")
      .select("starts_at")
      .in("category", GROUP_BLOCKING_CATEGORIES)
      .gte("starts_at", fromIso)
      .lte("starts_at", toIso)
    const blocked = new Set((regEvents ?? []).map((e) => dateKey(new Date(e.starts_at))))
    const conflicts = availableDates.filter((d) => blocked.has(d))
    if (conflicts.length > 0) {
      return {
        error: `정기봉사가 있는 날(${conflicts.join(", ")})은 ${GROUP_BLOCK_THRESHOLD}명 이상 단체 신청이 어려워요. 날짜를 변경하거나 인원을 조정해주세요.`,
      }
    }
  }

  const { data, error } = await admin
    .from("volunteer_applications")
    .insert({
      applicant_name,
      phone,
      email: user.email ?? null,
      party_size: partyCheck.partySize!,
      available_days: availableDays,
      available_dates: availableDates,
      available_time: String(formData.get("available_time") ?? "").trim() || null,
      activities,
      message: String(formData.get("message") ?? "").trim() || null,
      privacy_agreed: true,
      created_by: user.id,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[submitVolunteerApplication]", error)
    return { error: `신청 실패: ${error.message}` }
  }

  // 운영진에게 푸시 알림
  try {
    const { sendPushToStaff } = await import("@/features/push")
    await sendPushToStaff({
      title: "🐾 새 봉사 신청",
      body: `${applicant_name}님이 봉사를 신청했어요 (${partyCheck.partySize}명)`,
      url: `/admin/applications/volunteer/${data.id}`,
      tag: `volunteer-app-${data.id}`,
    })
  } catch (e) {
    console.error("[push volunteer-app]", e)
  }

  return { id: data.id }
}

/**
 * 회원이 본인 봉사 신청을 수정 (상태가 "접수" 또는 "검토중"일 때만 가능).
 * 승인/반려 후엔 운영진 처리가 끝났으니 수정 불가.
 */
export async function updateMyVolunteerApplication(
  id: string,
  formData: FormData
): Promise<SubmitResult> {
  const applicant_name = String(formData.get("applicant_name") ?? "").trim()
  const phone = formatKoreanPhone(String(formData.get("phone") ?? "").trim())

  const nameCheck = validateName(applicant_name)
  if (!nameCheck.valid) return { error: nameCheck.error }
  const phoneCheck = validateKoreanPhone(phone)
  if (!phoneCheck.valid) return { error: phoneCheck.error }
  const partyCheck = validatePartySize(String(formData.get("party_size") ?? "1"))
  if (!partyCheck.valid) return { error: partyCheck.error }

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) return { error: "로그인이 필요합니다." }

  // 본인 신청 + 수정 가능 상태 검증
  const { createAdminClient } = await import("@/shared/lib/supabase/admin")
  const admin = createAdminClient()
  const { data: prev } = await admin
    .from("volunteer_applications")
    .select("id, created_by, status")
    .eq("id", id)
    .maybeSingle()
  if (!prev) return { error: "신청 정보를 찾을 수 없습니다." }
  if (prev.created_by !== user.id) return { error: "본인 신청만 수정할 수 있습니다." }
  if (prev.status === "취소") return { error: "취소된 신청은 수정할 수 없습니다." }

  const availableDates = formData.getAll("available_dates").map(String)
  const activities = formData.getAll("activities").map(String) as VolunteerActivity[]

  const { error } = await admin
    .from("volunteer_applications")
    .update({
      applicant_name,
      phone,
      party_size: partyCheck.partySize!,
      available_dates: availableDates,
      available_time: String(formData.get("available_time") ?? "").trim() || null,
      activities,
      message: String(formData.get("message") ?? "").trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) {
    console.error("[updateMyVolunteerApplication]", error)
    return { error: error.message }
  }

  revalidatePath("/my/applications")
  return { id }
}

// ============================================================================
// 어드민용 처리 액션
// ============================================================================

function revalidateAdminApplications() {
  revalidatePath("/admin", "layout")
  revalidatePath("/admin/applications")
}

export async function updateAdoptionApplication(
  id: string,
  formData: FormData
): Promise<SubmitResult> {
  const status = String(formData.get("status") ?? "") as ApplicationStatus
  const adminNote = String(formData.get("admin_note") ?? "").trim()
  const cancelReason = String(formData.get("cancel_reason") ?? "").trim()

  if (status === "취소" && !cancelReason) {
    return { error: "취소 사유를 입력해주세요." }
  }

  const supabase = await createClient()

  // 상태 변경 전 created_by, phone, applicant_name 조회 (RLS 우회 위해 admin client 사용)
  const admin = createAdminClient()
  const { data: prev } = await admin
    .from("adoption_applications")
    .select("created_by, status, phone, applicant_name")
    .eq("id", id)
    .maybeSingle()

  const updatePayload: Record<string, unknown> = {
    status,
    admin_note: adminNote || null,
  }
  if (status === "취소") updatePayload.cancel_reason = cancelReason

  const { error } = await supabase
    .from("adoption_applications")
    .update(updatePayload)
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

    // 푸시 알림
    try {
      const { sendPushToUser } = await import("@/features/push")
      await sendPushToUser(
        {
          title: pushTitleForStatus(status, "입양"),
          body: status === "취소" && cancelReason
            ? `취소 사유: ${cancelReason}`
            : pushBodyForStatus(status),
          url: "/my/applications",
          tag: `adoption-status-${id}`,
        },
        prev.created_by
      )
    } catch (e) {
      console.error("[push adoption-status]", e)
    }

    // SMS 발송
    if (prev.phone) {
      let smsText: string | null = null
      if (status === "승인") {
        smsText = buildAdoptionSmsText(prev.applicant_name ?? "")
      } else if (status === "검토중" && prev.status !== "검토중") {
        smsText = buildReviewSmsText(prev.applicant_name ?? "", "입양")
      } else if (status === "취소" && prev.status !== "취소") {
        smsText = buildCancelSmsText(prev.applicant_name ?? "", "입양")
      }
      if (smsText) {
        try {
          const { sendSms } = await import("@/features/sms")
          await sendSms(prev.phone, smsText)
        } catch (e) {
          console.error("[sms adoption-status]", e)
        }
      }
    }
  }

  revalidateAdminApplications()
  revalidatePath(`/admin/applications/adoption/${id}`)
  return { id }
}

function pushTitleForStatus(status: ApplicationStatus, kind: "입양" | "봉사"): string {
  const icon = kind === "입양" ? "💕" : "🐾"
  switch (status) {
    case "승인":
      return `${icon} ${kind} 신청 승인`
    case "반려":
      return `${icon} ${kind} 신청 반려`
    case "검토중":
      return `${icon} ${kind} 신청 검토 중`
    case "취소":
      return `${icon} ${kind} 신청 취소`
    default:
      return `${icon} ${kind} 신청 상태 변경`
  }
}

function pushBodyForStatus(status: ApplicationStatus): string {
  switch (status) {
    case "승인":
      return "신청이 승인됐어요. 자세한 내용은 신청 내역에서 확인해주세요."
    case "반려":
      return "신청이 반려됐어요. 사유는 신청 내역에서 확인해주세요."
    case "검토중":
      return "신청이 검토 중이에요. 잠시만 기다려주세요."
    case "취소":
      return "신청이 취소됐어요. 신청 내역에서 사유를 확인해주세요."
    default:
      return "신청 상태가 변경됐어요."
  }
}

function buildVolunteerSmsText(applicantName: string): string {
  return `왕왕랜드\n${applicantName}님, 봉사 신청이 승인됐어요.\n신청내역에서 안내사항 확인해주세요.`
}

function buildAdoptionSmsText(applicantName: string): string {
  return `왕왕랜드\n${applicantName}님, 입양 신청이 승인됐어요.\n신청내역에서 안내사항 확인해주세요.`
}

function buildReviewSmsText(applicantName: string, kind: "입양" | "봉사"): string {
  return `왕왕랜드\n${applicantName}님, ${kind} 신청이 검토중이에요.\n운영진 상의 후 연락드릴게요.`
}

function buildCancelSmsText(applicantName: string, kind: "입양" | "봉사"): string {
  return `왕왕랜드\n${applicantName}님, ${kind} 신청이 취소되었어요.\n사유는 홈페이지에서 확인해주세요.`
}

function buildRescheduleSmsText(applicantName: string): string {
  return `왕왕랜드\n${applicantName}님, 봉사 일정이 변경됐어요.\n신청내역에서 안내사항 확인해주세요.`
}

function buildRescheduleRejectedSmsText(applicantName: string): string {
  return `왕왕랜드\n${applicantName}님, 봉사 일정변경 요청이 거절됐어요.\n신청내역에서 확인해주세요.`
}

function notificationTypeForStatus(status: ApplicationStatus): string {
  switch (status) {
    case "승인":
      return "application_approved"
    case "반려":
      return "application_rejected"
    case "검토중":
      return "application_under_review"
    case "취소":
      return "application_cancelled"
    default:
      return "application_status_changed"
  }
}

export async function updateVolunteerApplication(
  id: string,
  formData: FormData
): Promise<SubmitResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }

  const status = String(formData.get("status") ?? "") as ApplicationStatus
  const adminNote = String(formData.get("admin_note") ?? "").trim()
  const cancelReason = String(formData.get("cancel_reason") ?? "").trim()
  const rejectReschedule = formData.get("reject_reschedule") === "true"
  const scheduleMode = String(formData.get("schedule_mode") ?? "approval_only")
  const scheduleDates = [...new Set(formData.getAll("selected_dates").map(String))]
  const scheduleTime = String(formData.get("schedule_time") ?? "").trim()

  const validStatuses: ApplicationStatus[] = [
    "접수",
    "검토중",
    "승인",
    "반려",
    "취소",
  ]
  if (!validStatuses.includes(status)) {
    return { error: "처리 상태가 올바르지 않습니다." }
  }

  if (status === "취소" && !cancelReason) {
    return { error: "취소 사유를 입력해주세요." }
  }
  if (status === "반려" && !adminNote) {
    return { error: "반려 사유를 입력해주세요." }
  }

  const admin = createAdminClient()

  // 상태 변경 전 신청 정보 조회 (RLS 우회 위해 admin client 사용)
  const { data: prev } = await admin
    .from("volunteer_applications")
    .select(
      "id, applicant_name, party_size, activities, available_dates, available_time, message, created_by, status, phone, reschedule_dates, reschedule_time"
    )
    .eq("id", id)
    .maybeSingle()
  if (!prev) return { error: "신청 정보를 찾을 수 없습니다." }

  const isRescheduleRequest = prev.status === "일정변경요청"
  const rescheduleAccepted =
    isRescheduleRequest && status === "승인" && !rejectReschedule
  const rescheduleRejected =
    isRescheduleRequest && (status !== "승인" || rejectReschedule)
  const shouldCreateSchedule =
    status === "승인" && !rejectReschedule &&
    (isRescheduleRequest || scheduleMode === "with_schedule")

  if (shouldCreateSchedule && scheduleDates.length === 0) {
    return { error: "확정할 날짜를 1개 이상 선택해주세요." }
  }
  if (shouldCreateSchedule && !/^\d{2}:\d{2}$/.test(scheduleTime)) {
    return { error: "일정 시간을 확인해주세요." }
  }

  const scheduleStarts: string[] = []
  if (shouldCreateSchedule) {
    for (const date of scheduleDates) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return { error: "일정 날짜 형식이 올바르지 않습니다." }
      }
      const startsAt = localKstToIso(`${date}T${scheduleTime}`)
      if (!startsAt) return { error: "일정 날짜와 시간을 확인해주세요." }
      scheduleStarts.push(startsAt)
    }
  }

  const scheduleAction = rescheduleAccepted
    ? "replace"
    : shouldCreateSchedule
      ? "append"
      : "keep"

  const { error } = await admin.rpc("process_volunteer_application", {
    p_application_id: id,
    p_status: status,
    p_admin_note: adminNote || null,
    p_cancel_reason: cancelReason || null,
    p_schedule_action: scheduleAction,
    p_schedule_starts: scheduleStarts,
    p_clear_reschedule: isRescheduleRequest,
    p_created_by: auth.userId,
  })

  if (error) {
    console.error("[updateVolunteerApplication]", error)
    return { error: "처리 중 오류가 발생했습니다. 상태와 일정은 변경되지 않았습니다." }
  }

  // DB 처리가 모두 끝난 뒤 신청자 알림을 한 번만 발송한다.
  if (prev.created_by && prev.status !== status) {
    const notificationType = isRescheduleRequest
      ? rescheduleRejected
        ? "volunteer_reschedule_rejected"
        : "volunteer_reschedule_approved"
      : notificationTypeForStatus(status)
    await admin.from("notifications").insert({
      user_id: prev.created_by,
      type: notificationType,
      post_type: "volunteer",
      post_id: id,
      actor_id: null,
    })

    try {
      const { sendPushToUser } = await import("@/features/push")
      await sendPushToUser(
        {
          title: isRescheduleRequest
            ? rescheduleRejected
              ? "🐾 봉사 일정변경 거절"
              : "🐾 봉사 일정변경 승인"
            : pushTitleForStatus(status, "봉사"),
          body: isRescheduleRequest
            ? rescheduleRejected
              ? "기존 일정이 유지됩니다. 신청 내역에서 확인해주세요."
              : "변경된 일정을 신청 내역에서 확인해주세요."
            : status === "취소" && cancelReason
              ? `취소 사유: ${cancelReason}`
              : pushBodyForStatus(status),
          url: "/my/applications",
          tag: `volunteer-status-${id}`,
        },
        prev.created_by
      )
    } catch (e) {
      console.error("[push volunteer-status]", e)
    }

    // SMS 발송
    if (prev.phone) {
      let smsText: string | null = null
      if (status === "승인" && prev.status === "일정변경요청" && rejectReschedule) {
        smsText = buildRescheduleRejectedSmsText(prev.applicant_name ?? "")
      } else if (status === "승인" && prev.status === "일정변경요청") {
        smsText = buildRescheduleSmsText(prev.applicant_name ?? "")
      } else if (status === "승인" && prev.status !== "일정변경요청") {
        smsText = buildVolunteerSmsText(prev.applicant_name ?? "")
      } else if (prev.status === "일정변경요청" && status !== "승인") {
        smsText = buildRescheduleRejectedSmsText(prev.applicant_name ?? "")
      } else if (status === "검토중" && prev.status !== "검토중") {
        smsText = buildReviewSmsText(prev.applicant_name ?? "", "봉사")
      } else if (status === "취소" && prev.status !== "취소") {
        smsText = buildCancelSmsText(prev.applicant_name ?? "", "봉사")
      }
      if (smsText) {
        try {
          const { sendSms } = await import("@/features/sms")
          await sendSms(prev.phone, smsText)
        } catch (e) {
          console.error("[sms volunteer-status]", e)
        }
      }
    }
  }

  revalidateAdminApplications()
  revalidatePath(`/admin/applications/volunteer/${id}`)
  revalidatePath("/admin/calendar")
  revalidatePath("/calendar")
  return { id }
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
 * 회원이 본인 봉사 신청을 취소.
 * - 상태를 '취소'로 변경하고 취소 사유 저장 (행 보존)
 * - 연결된 캘린더 일정만 삭제
 */
export async function cancelOwnVolunteerApplication(
  id: string,
  cancelReason: string
): Promise<SubmitResult> {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return { error: "로그인이 필요합니다." }

  const admin = createAdminClient()

  const { data: app } = await admin
    .from("volunteer_applications")
    .select("created_by, status")
    .eq("id", id)
    .maybeSingle()
  if (!app) return { error: "신청을 찾을 수 없습니다." }
  if (app.created_by !== session.user.id) return { error: "본인 신청만 취소할 수 있습니다." }
  if (app.status === "취소") return { error: "이미 취소된 신청입니다." }

  const reason = cancelReason.trim()
  if (!reason) return { error: "취소 사유를 입력해주세요." }

  // 캘린더 일정만 삭제 (신청 행은 보존)
  await admin
    .from("events")
    .delete()
    .eq("source_application_type", "volunteer")
    .eq("source_application_id", id)

  const { error } = await admin
    .from("volunteer_applications")
    .update({ status: "취소", cancel_reason: reason })
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
 * 승인된 봉사 신청자가 일정변경을 요청.
 * - status → "일정변경요청", reschedule_dates / reschedule_time 저장
 * - 운영진에게 푸시 알림 발송
 */
export async function requestReschedule(
  id: string,
  formData: FormData
): Promise<SubmitResult> {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) return { error: "로그인이 필요합니다." }

  const admin = createAdminClient()

  const { data: prev } = await admin
    .from("volunteer_applications")
    .select("id, created_by, status, applicant_name")
    .eq("id", id)
    .maybeSingle()

  if (!prev) return { error: "신청 정보를 찾을 수 없습니다." }
  if (prev.created_by !== user.id) return { error: "본인 신청만 변경 요청할 수 있습니다." }
  if (prev.status !== "승인" && prev.status !== "일정변경요청") {
    return { error: "승인된 신청만 일정변경 요청할 수 있습니다." }
  }

  const datesRaw = String(formData.get("available_dates") ?? "").trim()
  const time = String(formData.get("available_time") ?? "").trim() || null

  let dates: string[]
  try {
    dates = JSON.parse(datesRaw)
    if (!Array.isArray(dates)) throw new Error()
  } catch {
    return { error: "날짜 형식이 올바르지 않습니다." }
  }

  if (dates.length === 0) return { error: "봉사 가능 날짜를 1개 이상 선택해주세요." }

  const { error } = await admin
    .from("volunteer_applications")
    .update({
      status: "일정변경요청",
      reschedule_dates: dates,
      reschedule_time: time,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) {
    console.error("[requestReschedule]", error)
    return { error: error.message }
  }

  // 운영진에게 푸시 알림
  try {
    const { sendPushToStaff } = await import("@/features/push")
    await sendPushToStaff(
      {
        title: "🗓️ 봉사 일정변경 요청",
        body: `${prev.applicant_name}님이 일정변경을 요청했어요.`,
        url: `/admin/applications/volunteer/${id}`,
        tag: `volunteer-reschedule-${id}`,
      },
      user.id
    )
  } catch (e) {
    console.error("[push reschedule]", e)
  }

  revalidatePath("/my/applications")
  return { id }
}

/**
 * 회원이 본인 입양 신청을 취소.
 * - 상태를 '취소'로 변경하고 취소 사유 저장 (행 보존)
 */
export async function cancelOwnAdoptionApplication(
  id: string,
  cancelReason: string
): Promise<SubmitResult> {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return { error: "로그인이 필요합니다." }

  const admin = createAdminClient()

  const { data: app } = await admin
    .from("adoption_applications")
    .select("created_by, status")
    .eq("id", id)
    .maybeSingle()
  if (!app) return { error: "신청을 찾을 수 없습니다." }
  if (app.created_by !== session.user.id) return { error: "본인 신청만 취소할 수 있습니다." }
  if (app.status === "취소") return { error: "이미 취소된 신청입니다." }

  const reason = cancelReason.trim()
  if (!reason) return { error: "취소 사유를 입력해주세요." }

  await admin
    .from("events")
    .delete()
    .eq("source_application_type", "adoption")
    .eq("source_application_id", id)

  const { error } = await admin
    .from("adoption_applications")
    .update({ status: "취소", cancel_reason: reason })
    .eq("id", id)

  if (error) {
    console.error("[cancelOwnAdoptionApplication]", error)
    return { error: error.message }
  }

  revalidatePath("/my/applications")
  revalidatePath("/admin/applications")
  return { id }
}
