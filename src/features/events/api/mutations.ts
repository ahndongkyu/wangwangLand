"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { createClient } from "@/shared/lib/supabase/server"
import { createAdminClient } from "@/shared/lib/supabase/admin"
import { dispatchEventNotification } from "../notify"
import { localKstToIso } from "../lib/date"
import { INTERNAL_CATEGORIES, type EventCategory, type EventVisibility } from "../types"

export interface ActionResult {
  error?: string
  id?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// 어드민: 이벤트 CRUD
// ─────────────────────────────────────────────────────────────────────────────

interface EventInput {
  category: EventCategory
  custom_label?: string | null
  custom_color?: string | null
  title: string
  description?: string
  location?: string
  starts_at: string
  ends_at: string
  all_day?: boolean
  signup_enabled?: boolean
  visibility: EventVisibility
}

const VALID_CATEGORIES: EventCategory[] = [
  "volunteer",
  "event",
  "closed",
  "custom",
  "adoption_consult",
  "foster_consult",
]

function parseEventInput(formData: FormData): EventInput | { error: string } {
  const category = String(formData.get("category") ?? "") as EventCategory
  if (!VALID_CATEGORIES.includes(category)) {
    return { error: "카테고리를 선택해주세요." }
  }

  let custom_label: string | null = null
  let custom_color: string | null = null
  if (category === "custom") {
    custom_label = String(formData.get("custom_label") ?? "").trim() || null
    if (!custom_label) {
      return { error: "직접 입력 카테고리 이름을 입력해주세요." }
    }
    const rawColor = String(formData.get("custom_color") ?? "").trim()
    if (rawColor && /^#[0-9A-Fa-f]{6}$/.test(rawColor)) {
      custom_color = rawColor
    }
  }

  const title = String(formData.get("title") ?? "").trim()
  if (!title) return { error: "제목을 입력해주세요." }

  const all_day = formData.get("all_day") === "on"
  const startsRaw = String(formData.get("starts_at") ?? "")
  // 종료 시간 입력은 제거됨 — 미입력 시 시작 시간과 동일하게(시점 일정) 저장.
  const endsRaw = String(formData.get("ends_at") ?? "") || startsRaw

  if (!startsRaw) {
    return { error: "일시를 입력해주세요." }
  }

  // datetime-local 은 timezone 이 없어서 서버에서 그대로 new Date() 하면 UTC 로 해석됨.
  // 항상 KST(+09:00) 로 강제 해석.
  const startsIso = localKstToIso(startsRaw, { allDay: all_day })
  const endsIso = localKstToIso(endsRaw, { allDay: all_day, isEnd: true })
  if (!startsIso || !endsIso) {
    return { error: "시간 형식이 올바르지 않습니다." }
  }
  const starts = new Date(startsIso)
  const ends = new Date(endsIso)
  if (ends < starts) return { error: "종료 시간이 시작 시간보다 빠릅니다." }

  const signup_enabled =
    category === "closed" ? false : formData.get("signup_enabled") === "on"
  // 봉사 카테고리는 기본값으로 신청 받음.
  const finalSignupEnabled = category === "volunteer" ? true : signup_enabled

  // 상담 카테고리(입양상담/임보상담)는 항상 관리자 전용. 그 외는 공개.
  const visibility: EventVisibility = INTERNAL_CATEGORIES.includes(category)
    ? "internal"
    : "public"

  return {
    category,
    custom_label,
    custom_color,
    title,
    description: String(formData.get("description") ?? "").trim() || undefined,
    location: String(formData.get("location") ?? "").trim() || undefined,
    starts_at: starts.toISOString(),
    ends_at: ends.toISOString(),
    all_day,
    signup_enabled: finalSignupEnabled,
    visibility,
  }
}

export async function createEvent(formData: FormData): Promise<ActionResult> {
  // 다중 날짜 모드 감지 — 봉사 신청에서 여러 날짜 선택해 한 번에 등록.
  const approveAppId =
    String(formData.get("approve_application_id") ?? "").trim() || null
  const selectedDates = formData
    .getAll("selected_dates")
    .map(String)
    .filter(Boolean)
  const startTime = String(formData.get("start_time") ?? "").trim()
  // 종료 시간 입력 제거됨 — 미입력 시 시작 시간과 동일.
  const endTime = String(formData.get("end_time") ?? "").trim() || startTime

  if (approveAppId && selectedDates.length > 0 && startTime) {
    const supabase = await createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session?.user) return { error: "로그인이 필요합니다." }
    return createMultiDateEvents({
      formData,
      approveAppId,
      selectedDates,
      startTime,
      endTime,
      userId: session.user.id,
    })
  }

  return createSingleEvent(formData)
}

async function createMultiDateEvents(opts: {
  formData: FormData
  approveAppId: string
  selectedDates: string[]
  startTime: string
  endTime: string
  userId: string
}): Promise<ActionResult> {
  const { formData, approveAppId, selectedDates, startTime, endTime, userId } = opts

  if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
    return { error: "시간 형식이 올바르지 않습니다." }
  }
  if (endTime < startTime) {
    return { error: "종료 시간이 시작 시간보다 빨라요." }
  }

  const title = String(formData.get("title") ?? "").trim()
  if (!title) return { error: "제목을 입력해주세요." }
  const description = String(formData.get("description") ?? "").trim() || null
  const location = String(formData.get("location") ?? "").trim() || null

  const admin = createAdminClient()

  // 날짜별로 INSERT 시도. unique 제약(같은 시작 시각)에 걸리면 자동 skip → 메시지로 안내.
  let insertedCount = 0
  let skippedCount = 0
  for (const date of selectedDates) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
    const startsIso = localKstToIso(`${date}T${startTime}`)
    const endsIso = localKstToIso(`${date}T${endTime}`)
    if (!startsIso || !endsIso) continue
    const starts = new Date(startsIso)
    const ends = new Date(endsIso)

    const { error } = await admin.from("events").insert({
      category: "volunteer",
      title,
      description,
      location,
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
      all_day: false,
      signup_enabled: false,
      visibility: "public",
      source_application_type: "volunteer",
      source_application_id: approveAppId,
      created_by: userId,
    })

    if (!error) {
      insertedCount++
    } else if (error.code === "23505" || /duplicate key/i.test(error.message)) {
      // 같은 (신청, 시작시각) 조합 중복 — 스킵
      skippedCount++
    } else {
      console.error("[createMultiDateEvents] insert failed", error)
      return { error: error.message }
    }
  }

  if (insertedCount === 0 && skippedCount === 0) {
    return { error: "등록된 일정이 없습니다. 날짜를 다시 확인해주세요." }
  }

  // 신청 status 승인 + 알림 (한 번만)
  const { data: app } = await admin
    .from("volunteer_applications")
    .select("created_by, status")
    .eq("id", approveAppId)
    .maybeSingle()

  await admin
    .from("volunteer_applications")
    .update({ status: "승인" })
    .eq("id", approveAppId)

  if (app?.created_by && app.status !== "승인") {
    await admin.from("notifications").insert({
      user_id: app.created_by,
      type: "application_approved",
      post_type: "volunteer",
      post_id: approveAppId,
      actor_id: null,
    })
  }

  revalidatePath("/admin", "layout")
  revalidatePath("/admin/applications")
  revalidatePath(`/admin/applications/volunteer/${approveAppId}`)
  revalidatePath("/admin/calendar")
  revalidatePath("/calendar")
  redirect("/admin/calendar")
}

async function createSingleEvent(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) return { error: "로그인이 필요합니다." }

  // 봉사 신청에서 가져온 일정이면, 등록 완료 시 신청 status 도 승인 처리.
  const approveAppId =
    String(formData.get("approve_application_id") ?? "").trim() || null

  const parsed = parseEventInput(formData)
  if ("error" in parsed) return parsed

  // 신청에서 가져왔으면 source_application_* 자동 채움 + visibility=public (마스킹 표시).
  const insertPayload: Record<string, unknown> = {
    ...parsed,
    created_by: session.user.id,
  }
  if (approveAppId) {
    insertPayload.source_application_type = "volunteer"
    insertPayload.source_application_id = approveAppId
    insertPayload.visibility = "public"
    insertPayload.signup_enabled = false

    // 다른 어드민이 이미 등록한 경우(중복) 방지.
    // 1) 명시적 사전 체크 — 정상 케이스의 메시지를 명확하게.
    const admin0 = createAdminClient()
    const { data: dup } = await admin0
      .from("events")
      .select("id")
      .eq("source_application_type", "volunteer")
      .eq("source_application_id", approveAppId)
      .maybeSingle()
    if (dup) {
      return {
        error:
          "이미 다른 운영진이 이 신청을 캘린더에 등록했습니다. 새로고침 후 확인해주세요.",
        id: dup.id,
      }
    }
  }

  const { data, error } = await supabase
    .from("events")
    .insert(insertPayload)
    .select("id")
    .single()

  if (error) {
    // 2) DB 유니크 제약(uniq_events_source_application) — race 마지막 방어선.
    if (approveAppId && (error.code === "23505" || /duplicate key/i.test(error.message))) {
      return {
        error:
          "이미 다른 운영진이 이 신청을 캘린더에 등록했습니다. 새로고침 후 확인해주세요.",
      }
    }
    console.error("[createEvent]", error)
    return { error: error.message }
  }

  // 봉사 신청 자동 승인 + 알림
  if (approveAppId) {
    const admin = createAdminClient()
    const { data: app } = await admin
      .from("volunteer_applications")
      .select("created_by, status")
      .eq("id", approveAppId)
      .maybeSingle()

    await admin
      .from("volunteer_applications")
      .update({ status: "승인" })
      .eq("id", approveAppId)

    if (app?.created_by && app.status !== "승인") {
      await admin.from("notifications").insert({
        user_id: app.created_by,
        type: "application_approved",
        post_type: "volunteer",
        post_id: approveAppId,
        actor_id: null,
      })
    }

    revalidatePath("/admin", "layout")
    revalidatePath("/admin/applications")
    revalidatePath(`/admin/applications/volunteer/${approveAppId}`)
  }

  revalidatePath("/admin/calendar")
  revalidatePath("/calendar")
  redirect(`/admin/calendar`)
}

export async function updateEvent(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const parsed = parseEventInput(formData)
  if ("error" in parsed) return parsed

  const supabase = await createClient()
  const { error } = await supabase
    .from("events")
    .update(parsed)
    .eq("id", id)

  if (error) {
    console.error("[updateEvent]", error)
    return { error: error.message }
  }

  // 신청자 전원에게 변경 알림
  await dispatchEventNotification({ eventId: id, type: "event_changed" })

  revalidatePath("/admin/calendar")
  revalidatePath(`/admin/calendar/${id}`)
  revalidatePath("/calendar")
  revalidatePath(`/calendar/${id}`)
  redirect(`/admin/calendar`)
}

export async function deleteEvent(id: string): Promise<ActionResult> {
  const admin = createAdminClient()

  // 삭제 전 알림 (신청자 전원)
  await dispatchEventNotification({ eventId: id, type: "event_canceled" })

  const { error } = await admin.from("events").delete().eq("id", id)
  if (error) {
    console.error("[deleteEvent]", error)
    return { error: error.message }
  }

  revalidatePath("/admin/calendar")
  revalidatePath("/calendar")
  redirect("/admin/calendar")
}

// ─────────────────────────────────────────────────────────────────────────────
// 회원: 슬롯 신청 / 취소
// ─────────────────────────────────────────────────────────────────────────────

export async function createSignup(
  eventId: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) return { error: "로그인이 필요합니다." }

  const partySize = Math.max(
    1,
    Math.min(20, Number(formData.get("party_size") ?? 1) || 1)
  )
  const message =
    String(formData.get("message") ?? "").trim() || null

  // 기존 취소 신청이 있으면 다시 '접수'로 되돌림 (unique 제약으로 INSERT 실패 방지)
  const { data: existing } = await supabase
    .from("event_signups")
    .select("id, status")
    .eq("event_id", eventId)
    .eq("user_id", session.user.id)
    .maybeSingle()

  if (existing) {
    if (existing.status === "접수") {
      return { error: "이미 신청한 일정입니다." }
    }
    const { error: updateErr } = await supabase
      .from("event_signups")
      .update({ status: "접수", party_size: partySize, message })
      .eq("id", existing.id)
    if (updateErr) {
      console.error("[createSignup re-activate]", updateErr)
      return { error: updateErr.message }
    }
  } else {
    const { error: insertErr } = await supabase
      .from("event_signups")
      .insert({
        event_id: eventId,
        user_id: session.user.id,
        party_size: partySize,
        message,
      })
    if (insertErr) {
      console.error("[createSignup]", insertErr)
      return { error: `신청 실패: ${insertErr.message}` }
    }
  }

  await dispatchEventNotification({
    eventId,
    type: "event_signup_confirmed",
    targetUserId: session.user.id,
  })

  revalidatePath(`/calendar/${eventId}`)
  revalidatePath("/calendar")
  revalidatePath("/my/applications")
  return { id: eventId }
}

export async function cancelSignup(
  eventId: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) return { error: "로그인이 필요합니다." }

  const { error } = await supabase
    .from("event_signups")
    .update({ status: "취소" })
    .eq("event_id", eventId)
    .eq("user_id", session.user.id)

  if (error) {
    console.error("[cancelSignup]", error)
    return { error: error.message }
  }

  revalidatePath(`/calendar/${eventId}`)
  revalidatePath("/calendar")
  revalidatePath("/my/applications")
  return { id: eventId }
}
