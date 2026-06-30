"use server"

import { randomUUID } from "crypto"

import { revalidatePath } from "next/cache"

import { createClient } from "@/shared/lib/supabase/server"
import { createAdminClient } from "@/shared/lib/supabase/admin"
import { dispatchEventNotification } from "../notify"
import { localKstToIso, dateKey, KST_OFFSET_MS } from "../lib/date"
import { generateOccurrenceDates } from "../lib/recurrence"
import { INTERNAL_CATEGORIES, type EventCategory, type EventVisibility } from "../types"

export interface ActionResult {
  error?: string
  id?: string
  /** 생성/수정/삭제된 건수 (반복 일괄 처리 시). */
  count?: number
}

/** 반복 일정 일괄 처리 범위. */
export type RecurrenceScope = "one" | "after" | "all"

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
  "regular_volunteer",
  "event",
  "closed",
  "custom",
  "adoption_consult",
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

  // 반복(정기) 일정 — 신청 연동이 아닌 일반 일정에서만.
  const recurMode = String(formData.get("recurrence_mode") ?? "none")
  if (!approveAppId && recurMode !== "none") {
    return createRecurringEvents(formData)
  }

  return createSingleEvent(formData)
}

async function createRecurringEvents(
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) return { error: "로그인이 필요합니다." }

  const parsed = parseEventInput(formData)
  if ("error" in parsed) return parsed

  const startRaw = String(formData.get("starts_at") ?? "")
  const startDate = startRaw.split("T")[0]
  const startTime = startRaw.split("T")[1] || "10:00"
  const allDay = parsed.all_day ?? false

  const dates = generateOccurrenceDates(startDate, {
    mode:
      String(formData.get("recurrence_mode")) === "monthly"
        ? "monthly"
        : "weekly",
    weekdays: String(formData.get("recurrence_weekdays") ?? "")
      .split(",")
      .filter(Boolean)
      .map(Number),
    monthlyMode:
      String(formData.get("recurrence_monthly_mode") ?? "bydate") === "bydow"
        ? "bydow"
        : "bydate",
    monthDay: Number(formData.get("recurrence_month_day") ?? 1),
    nth: Number(formData.get("recurrence_nth") ?? 1),
    nthWeekday: Number(formData.get("recurrence_nth_dow") ?? 0),
    until: String(formData.get("recurrence_until") ?? ""),
  })

  if (dates.length === 0) {
    return { error: "생성할 반복 일정이 없습니다. 조건을 확인해주세요." }
  }

  const groupId = randomUUID()
  const rows = dates
    .map((date) => {
      const local = allDay ? date : `${date}T${startTime}`
      const sIso = localKstToIso(local, { allDay })
      const eIso = localKstToIso(local, { allDay, isEnd: true })
      if (!sIso || !eIso) return null
      return {
        category: parsed.category,
        custom_label: parsed.custom_label,
        custom_color: parsed.custom_color,
        title: parsed.title,
        description: parsed.description ?? null,
        location: parsed.location ?? null,
        starts_at: sIso,
        ends_at: eIso,
        all_day: allDay,
        signup_enabled: parsed.signup_enabled,
        visibility: parsed.visibility,
        recurrence_group_id: groupId,
        created_by: session.user.id,
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)

  const { error } = await supabase.from("events").insert(rows)
  if (error) {
    console.error("[createRecurringEvents]", error)
    return { error: error.message }
  }

  revalidatePath("/admin/calendar")
  revalidatePath("/calendar")
  return { count: rows.length }
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
  return { count: insertedCount }
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
  return { id: data.id }
}

/** 반복 그룹에서 scope 에 해당하는 이벤트 id 들. 단건이면 [id]. */
async function resolveScopeIds(
  admin: ReturnType<typeof createAdminClient>,
  id: string,
  scope: RecurrenceScope
): Promise<string[]> {
  if (scope === "one") return [id]
  const { data: ev } = await admin
    .from("events")
    .select("recurrence_group_id, starts_at")
    .eq("id", id)
    .maybeSingle()
  if (!ev?.recurrence_group_id) return [id]
  let q = admin
    .from("events")
    .select("id")
    .eq("recurrence_group_id", ev.recurrence_group_id)
  if (scope === "after") q = q.gte("starts_at", ev.starts_at)
  const { data: group } = await q
  const ids = (group ?? []).map((g) => g.id as string)
  return ids.length > 0 ? ids : [id]
}

export async function updateEvent(
  id: string,
  formData: FormData,
  scope: RecurrenceScope = "one"
): Promise<ActionResult> {
  const parsed = parseEventInput(formData)
  if ("error" in parsed) return parsed

  // 단건 수정
  if (scope === "one") {
    const supabase = await createClient()
    const { error } = await supabase.from("events").update(parsed).eq("id", id)
    if (error) {
      console.error("[updateEvent]", error)
      return { error: error.message }
    }
    await dispatchEventNotification({ eventId: id, type: "event_changed" })
    revalidatePath("/admin/calendar")
    revalidatePath(`/admin/calendar/${id}`)
    revalidatePath("/calendar")
    revalidatePath(`/calendar/${id}`)
    return {}
  }

  // 반복 일괄 수정 — 날짜는 각자 유지, 시간/제목/장소/메모/카테고리 등만 일괄 적용
  const admin = createAdminClient()
  const { data: ev } = await admin
    .from("events")
    .select("recurrence_group_id, starts_at")
    .eq("id", id)
    .maybeSingle()
  if (!ev?.recurrence_group_id) {
    const { error } = await admin.from("events").update(parsed).eq("id", id)
    if (error) return { error: error.message }
    await dispatchEventNotification({ eventId: id, type: "event_changed" })
    revalidatePath("/admin/calendar")
    revalidatePath("/calendar")
    return {}
  }

  let q = admin
    .from("events")
    .select("id, starts_at")
    .eq("recurrence_group_id", ev.recurrence_group_id)
  if (scope === "after") q = q.gte("starts_at", ev.starts_at)
  const { data: group } = await q
  const targets = group ?? []

  const newAllDay = parsed.all_day ?? false
  const k = new Date(new Date(parsed.starts_at).getTime() + KST_OFFSET_MS)
  const newTime = `${String(k.getUTCHours()).padStart(2, "0")}:${String(k.getUTCMinutes()).padStart(2, "0")}`
  const seriesFields = {
    category: parsed.category,
    custom_label: parsed.custom_label,
    custom_color: parsed.custom_color,
    title: parsed.title,
    description: parsed.description ?? null,
    location: parsed.location ?? null,
    signup_enabled: parsed.signup_enabled,
    visibility: parsed.visibility,
    all_day: newAllDay,
  }

  for (const g of targets) {
    const date = dateKey(new Date(g.starts_at as string))
    const local = newAllDay ? date : `${date}T${newTime}`
    const sIso = localKstToIso(local, { allDay: newAllDay })
    const eIso = localKstToIso(local, { allDay: newAllDay, isEnd: true })
    if (!sIso || !eIso) continue
    await admin
      .from("events")
      .update({ ...seriesFields, starts_at: sIso, ends_at: eIso })
      .eq("id", g.id as string)
    await dispatchEventNotification({ eventId: g.id as string, type: "event_changed" })
  }

  revalidatePath("/admin/calendar")
  revalidatePath("/calendar")
  return { count: targets.length }
}

export async function deleteEvent(
  id: string,
  scope: RecurrenceScope = "one"
): Promise<ActionResult> {
  const admin = createAdminClient()
  const targetIds = await resolveScopeIds(admin, id, scope)

  // 삭제 전 알림 (각 일정 신청자)
  for (const tid of targetIds) {
    await dispatchEventNotification({ eventId: tid, type: "event_canceled" })
  }

  const { error } = await admin.from("events").delete().in("id", targetIds)
  if (error) {
    console.error("[deleteEvent]", error)
    return { error: error.message }
  }

  revalidatePath("/admin/calendar")
  revalidatePath("/calendar")
  return { count: targetIds.length }
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
