"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { createClient } from "@/shared/lib/supabase/server"
import { createAdminClient } from "@/shared/lib/supabase/admin"
import { dispatchEventNotification } from "../notify"
import type { EventCategory } from "../types"

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
}

function parseEventInput(formData: FormData): EventInput | { error: string } {
  const category = String(formData.get("category") ?? "") as EventCategory
  if (!["volunteer", "event", "closed", "custom"].includes(category)) {
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
  const endsRaw = String(formData.get("ends_at") ?? "")

  if (!startsRaw || !endsRaw) {
    return { error: "시작·종료 시간을 입력해주세요." }
  }

  // datetime-local("2026-04-30T10:00") 또는 date("2026-04-30") 둘 다 허용.
  const starts = new Date(all_day ? `${startsRaw}T00:00:00+09:00` : startsRaw)
  const ends = new Date(
    all_day ? `${endsRaw}T23:59:59+09:00` : endsRaw
  )
  if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime())) {
    return { error: "시간 형식이 올바르지 않습니다." }
  }
  if (ends < starts) return { error: "종료 시간이 시작 시간보다 빠릅니다." }

  const signup_enabled =
    category === "closed" ? false : formData.get("signup_enabled") === "on"
  // 봉사 카테고리는 기본값으로 신청 받음.
  const finalSignupEnabled = category === "volunteer" ? true : signup_enabled

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
  }
}

export async function createEvent(formData: FormData): Promise<ActionResult> {
  const parsed = parseEventInput(formData)
  if ("error" in parsed) return parsed

  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) return { error: "로그인이 필요합니다." }

  const { data, error } = await supabase
    .from("events")
    .insert({ ...parsed, created_by: session.user.id })
    .select("id")
    .single()

  if (error) {
    console.error("[createEvent]", error)
    return { error: error.message }
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
