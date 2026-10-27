"use server"
import { recordOperationError } from "@/features/operation-logs/server"

import { randomUUID } from "crypto"

import { revalidatePath } from "next/cache"

import { createClient } from "@/shared/lib/supabase/server"
import { createAdminClient } from "@/shared/lib/supabase/admin"
import { requireAdmin } from "@/shared/lib/auth"
import { dispatchEventNotification, prepareEventNotification } from "../notify"
import { snapshotVolunteerVisits, snapshotEventVisits, notifyVolunteerVisitChanges } from "../volunteer-notice"
import { localKstToIso } from "../lib/date"
import { generateOccurrenceDates } from "../lib/recurrence"
import { INTERNAL_CATEGORIES, type EventCategory, type EventVisibility } from "../types"

export interface ActionResult {
  error?: string
  conflict?: boolean
  warning?: string
  id?: string
  /** 생성/수정/삭제된 건수 (반복 일괄 처리 시). */
  count?: number
}

/** 반복 일정 일괄 처리 범위. */
export type RecurrenceScope = "one" | "after" | "all"
export type EventRevision = { id: string; updated_at: string }

const EVENT_CONFLICT = { conflict: true, error: "다른 담당자가 일정을 변경했거나 삭제했습니다. 최신 일정을 확인한 뒤 다시 처리해 주세요." }

function validRevisions(id: string, expected?: EventRevision[]): expected is EventRevision[] {
  return Array.isArray(expected) && expected.length > 0 && expected.length <= 1000
    && expected.some(row => row?.id === id)
    && new Set(expected.map(row => row?.id)).size === expected.length
    && expected.every(row => typeof row?.id === "string" && typeof row.updated_at === "string" && Number.isFinite(Date.parse(row.updated_at)))
}

// ─────────────────────────────────────────────────────────────────────────────
// 어드민: 이벤트 CRUD
// ─────────────────────────────────────────────────────────────────────────────

interface EventInput {
  application_block?: string
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
    application_block: category === "closed" ? "both" : category === "event" && ["volunteer", "adoption", "both"].includes(String(formData.get("application_block"))) ? String(formData.get("application_block")) : "none",
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

  if (approveAppId && startTime) {
    if (selectedDates.length === 0) {
      return { error: "등록할 날짜를 1개 이상 선택해주세요." }
    }
    const auth = await requireAdmin()
    if (!auth.ok) return { error: auth.error }
    return createMultiDateEvents({
      formData,
      approveAppId,
      selectedDates,
      startTime,
      endTime,
      userId: auth.userId,
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
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "로그인이 필요합니다." }

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
        application_block: parsed.application_block,
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
        created_by: user.id,
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)

  const { error } = await supabase.from("events").insert(rows)
  if (error) {
console.error("[createRecurringEvents]", error)
await recordOperationError("calendar", "createRecurringEvents", error, "calendar")
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

  const { data: application, error: applicationError } = await admin
    .from("volunteer_applications")
    .select("status")
    .eq("id", approveAppId)
    .maybeSingle()
  if (applicationError || !application) {
    return { error: "봉사 신청 정보를 찾을 수 없습니다." }
  }
  if (application.status !== "승인") {
    return { error: "승인된 봉사 신청에만 일정을 추가할 수 있습니다." }
  }

  const rows = []
  for (const date of [...new Set(selectedDates)]) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { error: "일정 날짜 형식이 올바르지 않습니다." }
    }
    const startsIso = localKstToIso(`${date}T${startTime}`)
    const endsIso = localKstToIso(`${date}T${endTime}`)
    if (!startsIso || !endsIso) {
      return { error: "일정 날짜와 시간을 확인해주세요." }
    }
    rows.push({
      category: "volunteer",
      title,
      description,
      location,
      starts_at: startsIso,
      ends_at: endsIso,
      all_day: false,
      signup_enabled: false,
      visibility: "public",
      source_application_type: "volunteer",
      source_application_id: approveAppId,
      created_by: userId,
    })
  }

  if (rows.length === 0) {
    return { error: "등록할 날짜를 1개 이상 선택해주세요." }
  }

  // 한 번의 INSERT 문으로 처리해 일부 날짜만 저장되는 상태를 막는다.
  let before
  try { before = await snapshotVolunteerVisits([approveAppId]) }
  catch { return { error: "기존 확정 일정을 확인하지 못했습니다. 다시 시도해주세요." } }
  const { error } = await admin.from("events").insert(rows)
  if (error) {
    if (error.code === "23505" || /duplicate key/i.test(error.message)) {
      return { error: "이미 등록된 일정이 포함되어 있습니다. 새로고침 후 다시 선택해주세요." }
    }
    console.error("[createMultiDateEvents]", error)
    await recordOperationError("calendar", "createMultiDateEvents", error, "calendar")
    return { error: error.message }
  }

  revalidatePath("/admin", "layout")
  revalidatePath("/admin/applications")
  revalidatePath(`/admin/applications/volunteer/${approveAppId}`)
  revalidatePath("/admin/calendar")
  revalidatePath("/calendar")
  const warning = await notifyVolunteerVisitChanges(before, true)
  revalidatePath("/my/applications")
  return { count: rows.length, warning }
}

async function createSingleEvent(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "로그인이 필요합니다." }

  // 봉사 신청에서 가져온 일정이면, 등록 완료 시 신청 status 도 승인 처리.
  const approveAppId =
    String(formData.get("approve_application_id") ?? "").trim() || null

  const parsed = parseEventInput(formData)
  if ("error" in parsed) return parsed

  // 신청에서 가져왔으면 source_application_* 자동 채움 + visibility=public (마스킹 표시).
  const insertPayload: Record<string, unknown> = {
    ...parsed,
    created_by: user.id,
  }
  if (approveAppId) {
    const auth = await requireAdmin()
    if (!auth.ok) return { error: auth.error }

    const admin0 = createAdminClient()
    const { data: application } = await admin0
      .from("volunteer_applications")
      .select("status")
      .eq("id", approveAppId)
      .maybeSingle()
    if (!application) return { error: "봉사 신청 정보를 찾을 수 없습니다." }
    if (application.status !== "승인") {
      return { error: "승인된 봉사 신청에만 일정을 추가할 수 있습니다." }
    }

    insertPayload.source_application_type = "volunteer"
    insertPayload.source_application_id = approveAppId
    insertPayload.visibility = "public"
    insertPayload.signup_enabled = false
  }

  let before
  try { before = await snapshotVolunteerVisits(approveAppId ? [approveAppId] : []) }
  catch { return { error: "기존 확정 일정을 확인하지 못했습니다. 다시 시도해주세요." } }
  const { data, error } = await supabase
    .from("events")
    .insert(insertPayload)
    .select("id")
    .single()

  if (error) {
    // 같은 신청·시작시각의 중복은 DB 제약으로 차단한다.
    if (approveAppId && (error.code === "23505" || /duplicate key/i.test(error.message))) {
      return {
        error:
          "같은 날짜와 시간의 일정이 이미 등록되어 있습니다. 새로고침 후 확인해주세요.",
      }
    }
    console.error("[createEvent]", error)
    await recordOperationError("calendar", "createEvent", error, "calendar")
    return { error: error.message }
  }

  // 승인된 신청에 일정을 추가한 경우 신청 상세도 갱신한다.
  if (approveAppId) {
    revalidatePath(`/admin/applications/volunteer/${approveAppId}`)
  }

  revalidatePath("/admin/calendar")
  revalidatePath("/calendar")
  const warning = await notifyVolunteerVisitChanges(before, true)
  revalidatePath("/my/applications")
  return { id: data.id, warning }
}

/** 반복 그룹에서 scope 에 해당하는 이벤트 id 들. 단건이면 [id]. */
async function resolveScopeIds(
  admin: ReturnType<typeof createAdminClient>,
  id: string,
  scope: RecurrenceScope
): Promise<string[]> {
  if (scope === "one") return [id]
  const { data: ev, error } = await admin
    .from("events")
    .select("recurrence_group_id, starts_at")
    .eq("id", id)
    .maybeSingle()
  if (error) throw new Error("일정을 확인할 수 없습니다.")
  if (!ev) throw new Error("EVENT_REVISION_CONFLICT")
  if (!ev?.recurrence_group_id) return [id]
  let q = admin
    .from("events")
    .select("id")
    .eq("recurrence_group_id", ev.recurrence_group_id)
  if (scope === "after") q = q.gte("starts_at", ev.starts_at)
  const { data: group, error: groupError } = await q
  if (groupError) throw new Error("반복 일정을 확인할 수 없습니다.")
  const ids = (group ?? []).map((g) => g.id as string)
  return ids.length > 0 ? ids : [id]
}

export async function updateEvent(
  id: string,
  formData: FormData,
  scope: RecurrenceScope = "one",
  expected?: EventRevision[]
): Promise<ActionResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }
  if (!validRevisions(id, expected)) return EVENT_CONFLICT
  const parsed = parseEventInput(formData)
  if ("error" in parsed) return parsed

  const admin = createAdminClient()
  let before
  try { before = await snapshotEventVisits(await resolveScopeIds(admin, id, scope)) }
  catch (error) { return error instanceof Error && error.message === "EVENT_REVISION_CONFLICT" ? EVENT_CONFLICT : { error: "기존 확정 일정을 확인하지 못했습니다. 다시 시도해주세요." } }
  const { data, error } = await admin.rpc("mutate_event_checked", {
    p_event_id: id, p_scope: scope, p_operation: "update", p_fields: parsed, p_expected: expected,
  })
  if (error) {
    if (error.message?.includes("EVENT_REVISION_CONFLICT")) return EVENT_CONFLICT
    if (error.message?.startsWith("신청 제한:")) return { error: error.message }
    console.error("[updateEvent recurring]", error)
    await recordOperationError("calendar", "updateEvent recurring", error, "calendar", { targetType: "event", targetId: id, action: "update" })
    return { error: "일정을 저장하지 못했습니다. 변경사항은 적용되지 않았습니다. 관리자에게 문의해 주세요." }
  }
  const changedIds = (data ?? []) as string[]
  for (const eventId of changedIds) {
    await dispatchEventNotification({ eventId, type: "event_changed" })
    revalidatePath(`/admin/calendar/${eventId}`)
    revalidatePath(`/calendar/${eventId}`)
  }

  revalidatePath("/admin/calendar")
  revalidatePath("/calendar")
  const warning = await notifyVolunteerVisitChanges(before)
  revalidatePath("/my/applications")
  return { count: changedIds.length, warning }
}

export async function deleteEvent(
  id: string,
  scope: RecurrenceScope = "one",
  expected?: EventRevision[]
): Promise<ActionResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }
  if (!validRevisions(id, expected)) return EVENT_CONFLICT
  const admin = createAdminClient()
  let snapshots
  let before
  try {
    const targetIds = await resolveScopeIds(admin, id, scope)
    snapshots = await Promise.all(targetIds.map((tid) => prepareEventNotification(tid)))
    before = await snapshotEventVisits(targetIds)
  } catch (error) {
    if (error instanceof Error && error.message === "EVENT_REVISION_CONFLICT") return EVENT_CONFLICT
    return { error: "일정과 알림 수신자를 확인하지 못했습니다. 다시 시도해주세요." }
  }

  const { data: deleted, error } = await admin.rpc("mutate_event_checked", {
    p_event_id: id, p_scope: scope, p_operation: "delete", p_fields: {}, p_expected: expected,
  })
  if (error) {
    if (error.message?.includes("EVENT_REVISION_CONFLICT")) return EVENT_CONFLICT
    console.error("[deleteEvent]", error)
    await recordOperationError("calendar", "deleteEvent", error, "calendar", { targetType: "event", targetId: id, action: "delete" })
    return { error: "일정을 삭제하지 못했습니다. 변경사항은 적용되지 않았습니다. 관리자에게 문의해 주세요." }
  }
  const deletedIds = new Set<string>((deleted ?? []) as string[])
  for (const snapshot of snapshots) {
    if (deletedIds.has(snapshot.eventId)) {
      await dispatchEventNotification({ eventId: snapshot.eventId, type: "event_canceled", snapshot })
    }
  }

  revalidatePath("/admin/calendar")
  revalidatePath("/calendar")
  const warning = deletedIds.size ? await notifyVolunteerVisitChanges(before) : undefined
  revalidatePath("/my/applications")
  return { count: deletedIds.size, warning }
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
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "로그인이 필요합니다." }

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
    .eq("user_id", user.id)
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
      await recordOperationError("calendar", "createSignup re-activate", updateErr, "calendar")
      return { error: updateErr.message }
    }
  } else {
    const { error: insertErr } = await supabase
      .from("event_signups")
      .insert({
        event_id: eventId,
        user_id: user.id,
        party_size: partySize,
        message,
      })
    if (insertErr) {
      console.error("[createSignup]", insertErr)
      await recordOperationError("calendar", "createSignup", insertErr, "calendar")
      return { error: `신청 실패: ${insertErr.message}` }
    }
  }

  await dispatchEventNotification({
    eventId,
    type: "event_signup_confirmed",
    targetUserId: user.id,
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
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "로그인이 필요합니다." }

  const { error } = await supabase
    .from("event_signups")
    .update({ status: "취소" })
    .eq("event_id", eventId)
    .eq("user_id", user.id)

  if (error) {
    console.error("[cancelSignup]", error)
    await recordOperationError("calendar", "cancelSignup", error, "calendar")
    return { error: error.message }
  }

  revalidatePath(`/calendar/${eventId}`)
  revalidatePath("/calendar")
  revalidatePath("/my/applications")
  return { id: eventId }
}
