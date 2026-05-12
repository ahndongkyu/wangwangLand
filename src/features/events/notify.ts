"use server"

import { createAdminClient } from "@/shared/lib/supabase/admin"

export type EventNotificationType =
  | "event_signup_confirmed"   // 본인이 신청 완료
  | "event_changed"            // 운영진이 일정 수정 → 신청자 전원
  | "event_canceled"           // 운영진이 일정 취소 → 신청자 전원
  | "event_reminder"           // 1일 전 자동 리마인더 (cron)

interface DispatchOpts {
  eventId: string
  type: EventNotificationType
  /** 특정 유저에게만 보낼 때. 없으면 해당 이벤트 신청자 전원. */
  targetUserId?: string
}

/**
 * 이벤트 관련 알림 발송 디스패처.
 * - 인앱 알림은 즉시 notifications 테이블에 insert.
 * - 카카오 알림톡은 추후 추가 (sendKakaoAlimtalk hook 미리 분리).
 */
export async function dispatchEventNotification(opts: DispatchOpts) {
  const { eventId, type, targetUserId } = opts
  const admin = createAdminClient()

  // 대상 유저 결정
  let userIds: string[] = []
  if (targetUserId) {
    userIds = [targetUserId]
  } else {
    const { data } = await admin
      .from("event_signups")
      .select("user_id")
      .eq("event_id", eventId)
      .eq("status", "접수")
    userIds = (data ?? []).map((r: { user_id: string }) => r.user_id)
  }
  if (userIds.length === 0) return

  // 인앱 알림
  const rows = userIds.map((uid) => ({
    user_id: uid,
    type,
    post_type: "event",
    post_id: eventId,
    actor_id: null,
  }))
  const { error } = await admin.from("notifications").insert(rows)
  if (error) console.error("[dispatchEventNotification] in-app:", error)

  // 이벤트 제목 조회 (Push 메시지용)
  const { data: ev } = await admin
    .from("events")
    .select("title, starts_at")
    .eq("id", eventId)
    .maybeSingle()
  const evTitle = (ev as { title?: string } | null)?.title ?? "일정"

  // Push 메시지 결정
  const pushConfig: Record<EventNotificationType, { title: string; body: string }> = {
    event_signup_confirmed: {
      title: "📅 신청 완료",
      body: `${evTitle} 신청이 접수되었어요.`,
    },
    event_changed: {
      title: "📅 일정 변경 안내",
      body: `신청하신 "${evTitle}" 일정이 변경되었어요. 확인해주세요.`,
    },
    event_canceled: {
      title: "📅 일정 취소 안내",
      body: `신청하신 "${evTitle}" 일정이 취소되었어요.`,
    },
    event_reminder: {
      title: "📅 내일 일정 리마인더",
      body: `내일 "${evTitle}" 일정이 있어요. 잊지 마세요!`,
    },
  }

  const { title, body } = pushConfig[type]

  // Push 알림 (실패해도 무시)
  try {
    const { sendPushToUser } = await import("@/features/push")
    await Promise.all(
      userIds.map((uid) =>
        sendPushToUser(
          { title, body, url: `/calendar/${eventId}`, tag: `event-${type}-${eventId}` },
          uid
        )
      )
    )
  } catch (e) {
    console.error("[dispatchEventNotification push]", e)
  }

  // 카카오 알림톡 — 미래 통합 지점.
  // await sendKakaoAlimtalk({ userIds, eventId, type })
}
