"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { createClient } from "@/shared/lib/supabase/server"
import { createAdminClient } from "@/shared/lib/supabase/admin"
import { requireAdmin } from "@/shared/lib/auth"
import { localKstToIso } from "@/features/events/lib/date"
import {
  GROUP_BLOCK_THRESHOLD,
  GROUP_BLOCKING_CATEGORIES,
} from "@/features/events/types"
import {
  formatVolunteerApplicantName,
  normalizeVolunteerGroupName,
} from "../lib/volunteer-applicant"
import { validateVolunteerSchedule } from "../lib/volunteer-operating-hours"
import {
  formatKoreanPhone,
  validateGroupPartySize,
  validateKoreanPhone,
  validateName,
  validateOrgOrPersonName,
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
  warning?: string
  field?: string
  id?: string
}

function validateVolunteerParty(partyType: string, value: string) {
  const result = partyType === "group" ? validateGroupPartySize(value) : validatePartySize(value)
  if (result.valid && partyType === "individual" && result.partySize !== 1) {
    return { valid: false, error: "개인 신청 인원수는 1명이어야 합니다.", partySize: undefined }
  }
  return result
}

/** 날짜·시간 검증을 통과한 신청에 동일한 정기봉사 제한을 적용한다. */
async function checkVolunteerGroupDates(
  admin: ReturnType<typeof createAdminClient>,
  dates: string[],
  partySize: number
): Promise<SubmitResult | null> {
  if (partySize < GROUP_BLOCK_THRESHOLD) return null
  // 선택한 날짜별로 존재 여부만 조회해, 넓은 기간 조회의 행 수 제한을 피한다.
  for (const date of new Set(dates)) {
    const { count, error } = await admin.from("events")
      .select("id", { count: "exact", head: true })
      .in("category", GROUP_BLOCKING_CATEGORIES)
      .gte("starts_at", new Date(`${date}T00:00:00+09:00`).toISOString())
      .lt("starts_at", new Date(new Date(`${date}T00:00:00+09:00`).getTime() + 86400000).toISOString())
    if (error || typeof count !== "number") return { error: "정기봉사 일정을 확인하지 못했습니다. 잠시 후 다시 시도해주세요.", field: "available_dates" }
    if (count > 0) return {
      error: `정기봉사가 있는 날(${date})은 ${GROUP_BLOCK_THRESHOLD}명 이상 단체 신청이 어려워요. 날짜를 변경하거나 인원을 조정해주세요.`,
      field: "available_dates",
    }
  }
  return null
}

export async function submitAdoptionApplication(
  formData: FormData
): Promise<SubmitResult> {
  const dogId = String(formData.get("dog_id") ?? "").trim()
  const catId = String(formData.get("cat_id") ?? "").trim()
  const animalMode = String(formData.get("animal_mode") ?? "")
  const preferredAnimal = String(formData.get("preferred_animal") ?? "").trim()
  if (!["select", "manual", "consult"].includes(animalMode)) return { error: "희망하는 아이 선택 방법을 확인해 주세요.", field: "animal_mode" }
  if (animalMode === "select" && (!dogId === !catId)) return { error: "신청할 아이를 한 마리 선택해 주세요.", field: "animal_mode" }
  if (animalMode === "manual" && (!preferredAnimal || preferredAnimal.length > 300)) return { error: "희망하는 아이의 이름이나 특징을 300자 이내로 적어주세요.", field: "preferred_animal" }
  const applicant_name = String(formData.get("applicant_name") ?? "").trim()
  const phone = formatKoreanPhone(String(formData.get("phone") ?? "").trim())
  const address = String(formData.get("address") ?? "").trim()
  const reason = String(formData.get("reason") ?? "").trim()
  const currentPets = String(formData.get("current_pets") ?? "").trim()
  const pastPetExperience = String(formData.get("past_pet_experience") ?? "").trim()
  const privacy_agreed = formData.get("privacy_agreed") === "on"

  const nameCheck = validateName(applicant_name)
  if (!nameCheck.valid) return { error: nameCheck.error }

  const phoneCheck = validateKoreanPhone(phone)
  if (!phoneCheck.valid) return { error: phoneCheck.error }

  if (address.length < 5) {
    return { error: "주소는 최소 시/도까지 입력해주세요." }
  }
  if (reason.length < 10) {
    return { error: "입양을 결심하신 이유를 10자 이상 적어주세요.", field: "reason" }
  }
  if (!currentPets) {
    return { error: "현재 반려동물 정보를 입력해 주세요. 없으면 ‘없음’으로 입력해 주세요." }
  }
  if (!pastPetExperience) {
    return { error: "과거 양육 경험을 입력해 주세요. 없으면 ‘없음’으로 입력해 주세요." }
  }
  if (!privacy_agreed) {
    return { error: "개인정보 수집·이용 동의가 필요합니다." }
  }

  const familySizeStr = String(formData.get("family_size") ?? "")
  const housingType = String(formData.get("housing_type") ?? "") as HousingType | ""
  const ownershipType = String(formData.get("ownership_type") ?? "") as OwnershipType | ""
  const hasChildren = String(formData.get("has_children") ?? "")
  const visitAvailableDates = [...new Set(formData.getAll("visit_available_dates").map(String))]
  const visitAvailableTime = String(formData.get("visit_available_time") ?? "").trim()

  const familySize = Number(familySizeStr)
  if (!Number.isInteger(familySize) || familySize < 1) {
    return { error: "가족 구성원 수를 1명 이상 입력해 주세요." }
  }
  if (hasChildren !== "true" && hasChildren !== "false") {
    return { error: "어린이 동거 여부를 선택해 주세요." }
  }
  if (!(["아파트", "주택", "빌라", "오피스텔", "기타"] as HousingType[]).some((type) => type === housingType)) {
    return { error: "주거 형태를 선택해 주세요." }
  }
  if (!(["자가", "전세", "월세"] as OwnershipType[]).some((type) => type === ownershipType)) {
    return { error: "소유 형태를 선택해 주세요." }
  }
  for (const [field, message] of [
    ["adult", "만 19세 이상의 성인 확인이 필요합니다."],
    ["family_consent", "동거 가족 전원의 동의 확인이 필요합니다."],
    ["readiness", "평생 양육 여건 확인이 필요합니다."],
    ["terms_agreed", "이용약관 동의가 필요합니다."],
    ...(["전세", "월세"].includes(ownershipType) ? [["landlord_consent", "임대인의 양육 동의 확인이 필요합니다."]] : []),
  ]) {
    if (formData.get(field) !== "on") return { error: message, field }
  }
  if (visitAvailableDates.length === 0 || visitAvailableDates.some((date) => !/^\d{4}-\d{2}-\d{2}$/.test(date))) {
    return { error: "방문 가능한 날짜를 하나 이상 선택해 주세요." }
  }
  if (!/^(10|11|13|14|15|16|17):(00|10|20|30|40|50)$/.test(visitAvailableTime)) {
    return { error: "방문 가능한 시간을 선택해 주세요." }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "로그인 후 입양 신청을 진행해 주세요." }
  const { data: profile } = await supabase.from("profiles").select("status, is_banned").eq("id", user.id).maybeSingle()
  if (!profile || profile.status !== "approved" || profile.is_banned) return { error: "현재 계정으로 신청할 수 없습니다. 회원 상태를 확인해 주세요." }
  const admin = createAdminClient()
  if (animalMode === "select") {
    const { data: animal, error } = await admin.from(dogId ? "dogs" : "cats")
      .select("id, status").eq("id", dogId || catId).maybeSingle()
    if (error || !animal || !["보호중", "임시보호중"].includes(animal.status)) {
      return { error: "현재 입양 신청이 가능한 아이를 다시 선택해 주세요.", field: "animal_mode" }
    }
  }

  const { data, error } = await admin
    .from("adoption_applications")
    .insert({
      dog_id: animalMode === "select" ? dogId || null : null,
      cat_id: animalMode === "select" ? catId || null : null,
      preferred_animal: animalMode === "manual" ? preferredAnimal : null,
      applicant_name,
      phone,
      email: user.email ?? null,
      address,
      reason,
      family_size: familySize,
      has_children: hasChildren === "true",
      housing_type: housingType,
      ownership_type: ownershipType,
      current_pets: currentPets,
      past_pet_experience: pastPetExperience,
      visit_available_dates: visitAvailableDates,
      visit_available_time: visitAvailableTime,
      privacy_agreed: true,
      created_by: user.id,
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
  const applicantName = String(formData.get("applicant_name") ?? "").trim()
  const groupName = normalizeVolunteerGroupName(
    String(formData.get("group_name") ?? "")
  )
  const phone = formatKoreanPhone(String(formData.get("phone") ?? "").trim())
  const privacy_agreed = formData.get("privacy_agreed") === "on"
  const partyType = String(formData.get("party_type") ?? "")

  if (partyType !== "individual" && partyType !== "group") {
    return { error: "신청 종류를 다시 선택해주세요." }
  }
  const nameCheck = validateName(applicantName)
  if (!nameCheck.valid) return { error: nameCheck.error, field: "applicant_name" }
  if (partyType === "group" && groupName) {
    const groupNameCheck = validateOrgOrPersonName(groupName)
    if (!groupNameCheck.valid) {
      return { error: groupNameCheck.error, field: "group_name" }
    }
  }

  const phoneCheck = validateKoreanPhone(phone)
  if (!phoneCheck.valid) return { error: phoneCheck.error, field: "phone" }

  const partyCheck = validateVolunteerParty(partyType, String(formData.get("party_size") ?? "1"))
  if (!partyCheck.valid) return { error: partyCheck.error, field: "party_size" }

  if (!privacy_agreed) {
    return { error: "개인정보 수집·이용 동의가 필요합니다.", field: "privacy_agreed" }
  }

  const availableDates = formData.getAll("available_dates").map(String)
  const availableTime = String(formData.get("available_time") ?? "").trim()
  const scheduleError = validateVolunteerSchedule(availableDates, availableTime)
  if (scheduleError) {
    return {
      error: scheduleError,
      field: availableDates.length === 0 ? "available_dates" : "available_time",
    }
  }

  for (const [field, message] of [
    ["preparation_acknowledged", "준비물과 방문 안내를 확인해 주세요."],
    ["safety_acknowledged", "안전 사항 인지 동의가 필요합니다."],
    ["terms_agreed", "이용약관 동의가 필요합니다."],
  ] as const) {
    if (formData.get(field) !== "on") return { error: message, field }
  }
  if (partyType === "group" && formData.get("has_minor") === "on" && formData.get("minor_guardian") !== "on") {
    return { error: "미성년자 참여 시 보호자 동의가 필요합니다.", field: "minor_guardian" }
  }

  // available_days(요일) 는 폼에서 제거됐지만 컬럼은 유지(legacy). 빈 배열로 저장.
  const availableDays: string[] = []
  // 신규 신청에서는 희망 활동을 받지 않으며, 과거 신청 기록은 유지한다.
  const activities: VolunteerActivity[] = []

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

  const groupDateError = await checkVolunteerGroupDates(admin, availableDates, partyCheck.partySize!)
  if (groupDateError) return groupDateError

  const { data, error } = await admin
    .from("volunteer_applications")
    .insert({
      applicant_name: applicantName,
      group_name: partyType === "group" ? groupName : null,
      phone,
      email: user.email ?? null,
      party_size: partyCheck.partySize!,
      available_days: availableDays,
      available_dates: availableDates,
      available_time: availableTime,
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
    const displayName = formatVolunteerApplicantName(
      applicantName,
      partyType === "group" ? groupName : null
    )
    await sendPushToStaff({
      title: "🐾 새 봉사 신청",
      body: `${displayName}님이 봉사를 신청했어요 (${partyCheck.partySize}명)`,
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
  const applicantName = String(formData.get("applicant_name") ?? "").trim()
  const groupName = normalizeVolunteerGroupName(
    String(formData.get("group_name") ?? "")
  )
  const partyType = String(formData.get("party_type") ?? "")
  const phone = formatKoreanPhone(String(formData.get("phone") ?? "").trim())

  if (partyType !== "individual" && partyType !== "group") {
    return { error: "신청 종류를 다시 확인해주세요." }
  }
  const nameCheck = validateName(applicantName)
  if (!nameCheck.valid) return { error: nameCheck.error, field: "applicant_name" }
  if (partyType === "group" && groupName) {
    const groupNameCheck = validateOrgOrPersonName(groupName)
    if (!groupNameCheck.valid) {
      return { error: groupNameCheck.error, field: "group_name" }
    }
  }
  const phoneCheck = validateKoreanPhone(phone)
  if (!phoneCheck.valid) return { error: phoneCheck.error, field: "phone" }
  const partyCheck = validateVolunteerParty(partyType, String(formData.get("party_size") ?? "1"))
  if (!partyCheck.valid) return { error: partyCheck.error, field: "party_size" }
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) return { error: "로그인이 필요합니다." }

  // 본인 신청 + 수정 가능 상태 검증
  const { createAdminClient } = await import("@/shared/lib/supabase/admin")
  const admin = createAdminClient()
  const { data: prev } = await admin
    .from("volunteer_applications")
    .select("id, created_by, status, updated_at")
    .eq("id", id)
    .maybeSingle()
  if (!prev) return { error: "신청 정보를 찾을 수 없습니다." }
  if (prev.created_by !== user.id) return { error: "본인 신청만 수정할 수 있습니다." }
  if (!["접수", "검토중"].includes(prev.status)) {
    return { error: "접수·검토중인 신청만 수정할 수 있습니다. 승인된 신청은 일정 변경을 요청해주세요." }
  }
  const expectedUpdatedAt = String(formData.get("expected_updated_at") ?? "")
  if (!expectedUpdatedAt || expectedUpdatedAt !== prev.updated_at) {
    return { error: "신청 내용이 변경되었습니다. 신청 내역을 새로 확인한 뒤 수정해주세요." }
  }

  const availableDates = formData.getAll("available_dates").map(String)
  const availableTime = String(formData.get("available_time") ?? "").trim()
  const scheduleError = validateVolunteerSchedule(availableDates, availableTime)
  if (scheduleError) {
    return {
      error: scheduleError,
      field: availableDates.length === 0 ? "available_dates" : "available_time",
    }
  }

  const groupDateError = await checkVolunteerGroupDates(admin, availableDates, partyCheck.partySize!)
  if (groupDateError) return groupDateError

  const { data: updated, error } = await admin
    .from("volunteer_applications")
    .update({
      applicant_name: applicantName,
      group_name: partyType === "group" ? groupName : null,
      phone,
      party_size: partyCheck.partySize!,
      available_dates: availableDates,
      available_time: availableTime,
      message: String(formData.get("message") ?? "").trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("created_by", user.id)
    .eq("status", prev.status)
    .eq("updated_at", expectedUpdatedAt)
    .select("id")
    .maybeSingle()

  if (error) {
    console.error("[updateMyVolunteerApplication]", error)
    return { error: error.message }
  }
  if (!updated) return { error: "저장 중 신청 상태나 내용이 변경되었습니다. 신청 내역을 새로 확인해주세요." }

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
  let warning: string | undefined
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }
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
          const delivery = await sendSms(prev.phone, smsText, { applicationId: id, applicationType: "adoption", recipientName: prev.applicant_name ?? "" })
          if (!delivery.ok) warning = `${delivery.error} SMS 발송 내역을 확인해주세요.`
        } catch (e) {
          warning = "문자 발송 결과를 확인하지 못했습니다. SMS 발송 내역을 확인해주세요."
          console.error("[sms adoption-status]", e)
        }
      }
    }
  }

  revalidateAdminApplications()
  revalidatePath(`/admin/applications/adoption/${id}`)
  return { id, ...(warning ? { warning } : {}) }
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

function buildVolunteerSmsText(applicantName: string, starts: string[], partySize: number): string {
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"]
  const visits = [...new Set(starts)].sort().map(start => {
    const local = new Date(new Date(start).getTime() + 9 * 60 * 60 * 1000)
    return `${local.toISOString().slice(0, 10).replaceAll("-", ".")}(${weekdays[local.getUTCDay()]}) ${local.toISOString().slice(11, 16)}`
  })
  return `[왕왕랜드 봉사 안내]\n${applicantName}님, 봉사 신청이 승인되었습니다.\n\n방문 일정: ${visits.length ? visits.join("\n") : "별도 안내 예정"}\n참여 인원: ${partySize}명\n\n준비물과 신청 내역은 마이페이지에서 확인해 주세요.\n일정 변경이나 취소가 필요한 경우 미리 알려주세요.`
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
  let warning: string | undefined
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }

  const status = String(formData.get("status") ?? "") as ApplicationStatus
  const adminNote = String(formData.get("admin_note") ?? "").trim()
  const cancelReason = String(formData.get("cancel_reason") ?? "").trim()
  const rejectReschedule = formData.get("reject_reschedule") === "true"
  const scheduleMode = String(formData.get("schedule_mode") ?? "approval_only")

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
      "id, applicant_name, group_name, party_size, activities, available_dates, available_time, message, created_by, status, phone, reschedule_dates, reschedule_time, updated_at"
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
  const requestedDates = isRescheduleRequest
    ? ((prev.reschedule_dates as string[] | null) ?? [])
    : ((prev.available_dates as string[] | null) ?? [])
  const requestedTime = isRescheduleRequest
    ? (prev.reschedule_time as string | null)
    : (prev.available_time as string | null)

  if (shouldCreateSchedule && requestedDates.length === 0) {
    return { error: "신청자가 입력한 날짜가 없어 일정을 자동 등록할 수 없습니다." }
  }
  if (shouldCreateSchedule && !requestedTime) {
    return { error: "신청자가 입력한 시간이 없어 일정을 자동 등록할 수 없습니다." }
  }
  if (shouldCreateSchedule && !/^\d{2}:\d{2}$/.test(requestedTime ?? "")) {
    return { error: "신청자의 방문 시간 형식이 올바르지 않습니다." }
  }

  const scheduleStarts: string[] = []
  if (shouldCreateSchedule) {
    for (const date of [...new Set(requestedDates)]) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return { error: "신청자의 방문 날짜 형식이 올바르지 않습니다." }
      }
      const startsAt = localKstToIso(`${date}T${requestedTime}`)
      if (!startsAt) return { error: "신청자의 방문 날짜와 시간을 확인해주세요." }
      scheduleStarts.push(startsAt)
    }
  }

  const scheduleAction = rescheduleAccepted
    ? "replace"
    : shouldCreateSchedule
      ? "append"
      : "keep"

  const { error } = await admin.rpc("process_volunteer_application_checked", {
    p_application_id: id,
    p_status: status,
    p_admin_note: adminNote || null,
    p_cancel_reason: cancelReason || null,
    p_schedule_action: scheduleAction,
    p_schedule_starts: scheduleStarts,
    p_clear_reschedule: isRescheduleRequest,
    p_created_by: auth.userId,
    p_expected_status: prev.status,
    p_expected_updated_at: prev.updated_at,
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
      const volunteerApplicantName = formatVolunteerApplicantName(
        prev.applicant_name ?? "",
        prev.group_name
      )
      let smsText: string | null = null
      if (status === "승인" && prev.status === "일정변경요청" && rejectReschedule) {
        smsText = buildRescheduleRejectedSmsText(volunteerApplicantName)
      } else if (status === "승인" && prev.status === "일정변경요청") {
        smsText = buildRescheduleSmsText(volunteerApplicantName)
      } else if (status === "승인" && prev.status !== "일정변경요청") {
        let confirmedStarts = scheduleStarts
        if (!shouldCreateSchedule) {
          const { data: events, error: scheduleError } = await admin.from("events")
            .select("starts_at").eq("source_application_type", "volunteer").eq("source_application_id", id)
          if (!scheduleError) confirmedStarts = (events ?? []).map(event => event.starts_at)
        }
        smsText = buildVolunteerSmsText(volunteerApplicantName, confirmedStarts, prev.party_size ?? 1)
      } else if (prev.status === "일정변경요청" && status !== "승인") {
        smsText = buildRescheduleRejectedSmsText(volunteerApplicantName)
      } else if (status === "검토중" && prev.status !== "검토중") {
        smsText = buildReviewSmsText(volunteerApplicantName, "봉사")
      } else if (status === "취소" && prev.status !== "취소") {
        smsText = buildCancelSmsText(volunteerApplicantName, "봉사")
      }
      if (smsText) {
        try {
          const { sendSms } = await import("@/features/sms")
          const delivery = await sendSms(prev.phone, smsText, { applicationId: id, applicationType: "volunteer", recipientName: volunteerApplicantName })
          if (!delivery.ok) warning = `${delivery.error} SMS 발송 내역을 확인해주세요.`
        } catch (e) {
          warning = "문자 발송 결과를 확인하지 못했습니다. SMS 발송 내역을 확인해주세요."
          console.error("[sms volunteer-status]", e)
        }
      }
    }
  }

  revalidateAdminApplications()
  revalidatePath(`/admin/applications/volunteer/${id}`)
  revalidatePath("/admin/calendar")
  revalidatePath("/calendar")
  return { id, ...(warning ? { warning } : {}) }
}

export async function deleteAdoptionApplication(
  id: string
): Promise<SubmitResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }
  const admin = createAdminClient()
  const { error } = await admin.rpc("delete_application_with_events", {
    p_application_id: id, p_application_type: "adoption",
  })

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
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }
  const admin = createAdminClient()
  const { error } = await admin.rpc("delete_application_with_events", {
    p_application_id: id, p_application_type: "volunteer",
  })

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

  const { error } = await supabase.rpc("cancel_own_application_with_events", {
    p_application_id: id,
    p_application_type: "volunteer",
    p_cancel_reason: reason,
  })

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
    .select("id, created_by, status, applicant_name, group_name, party_size, updated_at")
    .eq("id", id)
    .maybeSingle()

  if (!prev) return { error: "신청 정보를 찾을 수 없습니다." }
  if (prev.created_by !== user.id) return { error: "본인 신청만 변경 요청할 수 있습니다." }
  if (prev.status !== "승인" && prev.status !== "일정변경요청") {
    return { error: "승인된 신청만 일정변경 요청할 수 있습니다." }
  }
  const expectedUpdatedAt = String(formData.get("expected_updated_at") ?? "")
  if (!expectedUpdatedAt || expectedUpdatedAt !== prev.updated_at) {
    return { error: "신청 내용이 변경되었습니다. 신청 내역을 새로 확인한 뒤 요청해주세요." }
  }
  const partyCheck = validatePartySize(prev.party_size)
  if (!partyCheck.valid) return { error: "기존 신청 인원을 확인할 수 없습니다. 운영진에게 문의해주세요." }

  const datesRaw = String(formData.get("available_dates") ?? "").trim()
  const time = String(formData.get("available_time") ?? "").trim()

  let dates: string[]
  try {
    dates = JSON.parse(datesRaw)
    if (!Array.isArray(dates) || dates.some(date => typeof date !== "string")) throw new Error()
  } catch {
    return { error: "날짜 형식이 올바르지 않습니다." }
  }

  const scheduleError = validateVolunteerSchedule(dates, time)
  if (scheduleError) return { error: scheduleError }
  const groupDateError = await checkVolunteerGroupDates(admin, dates, partyCheck.partySize!)
  if (groupDateError) return groupDateError

  const { data: updated, error } = await admin
    .from("volunteer_applications")
    .update({
      status: "일정변경요청",
      reschedule_dates: dates,
      reschedule_time: time,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("created_by", user.id)
    .eq("status", prev.status)
    .eq("updated_at", expectedUpdatedAt)
    .select("id")
    .maybeSingle()

  if (error) {
    console.error("[requestReschedule]", error)
    return { error: error.message }
  }
  if (!updated) return { error: "요청 중 신청 상태나 내용이 변경되었습니다. 신청 내역을 새로 확인해주세요." }

  // 운영진에게 푸시 알림
  try {
    const { sendPushToStaff } = await import("@/features/push")
    const displayName = formatVolunteerApplicantName(
      prev.applicant_name,
      prev.group_name
    )
    await sendPushToStaff(
      {
        title: "🗓️ 봉사 일정변경 요청",
        body: `${displayName}님이 일정변경을 요청했어요.`,
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

  const { error } = await supabase.rpc("cancel_own_application_with_events", {
    p_application_id: id,
    p_application_type: "adoption",
    p_cancel_reason: reason,
  })

  if (error) {
    console.error("[cancelOwnAdoptionApplication]", error)
    return { error: error.message }
  }

  revalidatePath("/my/applications")
  revalidatePath("/admin/applications")
  revalidatePath("/calendar")
  revalidatePath("/admin/calendar")
  return { id }
}
