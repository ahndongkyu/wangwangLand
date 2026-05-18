"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { createClient } from "@/shared/lib/supabase/server"
import { createAdminClient } from "@/shared/lib/supabase/admin"
import { localKstToIso } from "@/features/events/lib/date"
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

/**
 * 봉사 신청 승인 시 캘린더 이벤트를 upsert.
 * - 해당 신청에 연결된 기존 이벤트가 없으면 INSERT, 있으면 스킵(다중 등록은 상세 페이지에서).
 * - startsAt / endsAt 이 null 이면 아무것도 하지 않음.
 */
async function upsertVolunteerEventForApplication(
  applicationId: string,
  applicantName: string,
  partySize: number,
  startsAt: string | null,
) {
  if (!startsAt) return
  const admin = createAdminClient()

  // 이미 연결된 이벤트가 있으면 중복 생성 방지
  const { count } = await admin
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("source_application_type", "volunteer")
    .eq("source_application_id", applicationId)
  if ((count ?? 0) > 0) return

  const title =
    partySize > 1
      ? `봉사 – ${applicantName} (${partySize}명)`
      : `봉사 – ${applicantName}`

  const { error } = await admin.from("events").insert({
    title,
    starts_at: startsAt,
    ends_at: startsAt, // DB NOT NULL 대비, UI에는 노출 안 함
    is_all_day: false,
    source_application_type: "volunteer",
    source_application_id: applicationId,
  })
  if (error) console.error("[upsertVolunteerEvent]", error)
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

    // SMS 발송 (승인 시만)
    if (status === "승인" && prev.phone) {
      try {
        const { sendSms } = await import("@/features/sms")
        await sendSms(
          prev.phone,
          buildAdoptionSmsText(prev.applicant_name ?? "")
        )
      } catch (e) {
        console.error("[sms adoption-status]", e)
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

function buildVolunteerSmsText(applicantName: string, availableDates: string[]): string {
  const name = `${applicantName}님`
  const url = `\n\nwangwangland.kr/my/applications`
  const dateStr = availableDates[0] ?? ""
  let dateLine = ""
  if (dateStr) {
    const [, m, d] = dateStr.split("-").map(Number)
    const dow = ["일", "월", "화", "수", "목", "금", "토"][
      new Date(`${dateStr}T00:00:00+09:00`).getDay()
    ]
    dateLine = `\n일정: ${m}월 ${d}일(${dow})`
  }
  return `[왕왕랜드] ${name}, 봉사 신청이 승인됐어요.${dateLine}\n준비물 등 자세한 내용은 신청 내역에서 확인해주세요.${url}`
}

function buildAdoptionSmsText(applicantName: string): string {
  const name = `${applicantName}님`
  const url = `\n\nwangwangland.kr/my/applications`
  return `[왕왕랜드] ${name}, 입양 신청이 승인됐어요.\n자세한 내용은 신청 내역에서 확인해주세요.${url}`
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
  const status = String(formData.get("status") ?? "") as ApplicationStatus
  const adminNote = String(formData.get("admin_note") ?? "").trim()
  const cancelReason = String(formData.get("cancel_reason") ?? "").trim()

  // 일정 등록 필드 (Step 3 — 승인 시만 채워짐)
  const scheduledStartRaw = String(formData.get("scheduled_starts_at") ?? "").trim()
  const scheduledStart = localKstToIso(scheduledStartRaw)

  if (status === "취소" && !cancelReason) {
    return { error: "취소 사유를 입력해주세요." }
  }

  const supabase = await createClient()
  const admin = createAdminClient()

  // 상태 변경 전 신청 정보 조회 (RLS 우회 위해 admin client 사용)
  const { data: prev } = await admin
    .from("volunteer_applications")
    .select(
      "id, applicant_name, party_size, activities, available_dates, available_time, message, created_by, status, phone"
    )
    .eq("id", id)
    .maybeSingle()

  const updatePayload: Record<string, unknown> = {
    status,
    admin_note: adminNote || null,
  }
  if (status === "취소") updatePayload.cancel_reason = cancelReason

  const { error } = await supabase
    .from("volunteer_applications")
    .update(updatePayload)
    .eq("id", id)

  if (error) {
    console.error("[updateVolunteerApplication]", error)
    return { error: error.message }
  }

  // 승인 → 일정 등록 (폼에서 날짜가 입력된 경우에만)
  if (status === "승인" && prev) {
    await upsertVolunteerEventForApplication(
      id,
      prev.applicant_name ?? "",
      prev.party_size ?? 1,
      scheduledStart,
    )
  }

  // 취소·반려 → 연결 캘린더 이벤트 삭제
  if (status === "취소" || status === "반려") {
    await admin
      .from("events")
      .delete()
      .eq("source_application_type", "volunteer")
      .eq("source_application_id", id)
  }

  // 상태가 실제로 바뀌었고, created_by가 있으면 유저에게 알림 발송
  if (prev?.created_by && prev.status !== status) {
    await admin.from("notifications").insert({
      user_id: prev.created_by,
      type: notificationTypeForStatus(status),
      post_type: "volunteer",
      post_id: id,
      actor_id: null,
    })

    try {
      const { sendPushToUser } = await import("@/features/push")
      await sendPushToUser(
        {
          title: pushTitleForStatus(status, "봉사"),
          body: status === "취소" && cancelReason
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

    // SMS 발송 (승인 시만)
    if (status === "승인" && prev.phone) {
      try {
        const { sendSms } = await import("@/features/sms")
        await sendSms(
          prev.phone,
          buildVolunteerSmsText(prev.applicant_name ?? "", prev.available_dates ?? [])
        )
      } catch (e) {
        console.error("[sms volunteer-status]", e)
      }
    }
  }

  revalidateAdminApplications()
  revalidatePath(`/admin/applications/volunteer/${id}`)
  revalidatePath("/admin/calendar")
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
