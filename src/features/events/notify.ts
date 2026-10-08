import "server-only"

import { createAdminClient } from "@/shared/lib/supabase/admin"
import { recordOperationError } from "@/features/operation-logs/server"

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
  snapshot?: EventNotificationSnapshot
}

export interface EventNotificationSnapshot {
  eventId: string
  title: string
  userIds: string[]
}

/** 삭제로 신청 정보가 사라지기 전에 수신 대상과 제목을 보관한다. */
export async function prepareEventNotification(eventId: string, targetUserId?: string): Promise<EventNotificationSnapshot> {
  const admin = createAdminClient()
  const { data: event, error } = await admin.from("events")
    .select("title, source_application_type, source_application_id").eq("id", eventId).maybeSingle()
  if (error || !event) throw new Error("일정 알림 정보를 확인할 수 없습니다.")
  const userIds = new Set<string>()
  if (targetUserId) {
    userIds.add(targetUserId)
  } else {
    // 많은 신청자가 있어도 조회 제한으로 누락되지 않도록 나누어 조회한다.
    for (let offset = 0; ; offset += 500) {
      const { data, error: signupError } = await admin.from("event_signups")
        .select("user_id").eq("event_id", eventId).eq("status", "접수")
        .order("id").range(offset, offset + 499)
      if (signupError) throw new Error("일정 신청자를 확인할 수 없습니다.")
      for (const row of data ?? []) if (row.user_id) userIds.add(row.user_id)
      if (!data || data.length < 500) break
    }
    if (event.source_application_id &&
      (event.source_application_type === "volunteer" || event.source_application_type === "adoption")) {
      const table = event.source_application_type === "volunteer" ? "volunteer_applications" : "adoption_applications"
      const { data: application, error: applicationError } = await admin.from(table)
        .select("created_by").eq("id", event.source_application_id).maybeSingle()
      if (applicationError) throw new Error("연결된 신청자를 확인할 수 없습니다.")
      if (application?.created_by) userIds.add(application.created_by)
    }
  }
  return { eventId, title: event.title ?? "일정", userIds: [...userIds] }
}

/**
 * 이벤트 관련 알림 발송 디스패처.
 * - 인앱 알림은 즉시 notifications 테이블에 insert.
 * - 카카오 알림톡은 추후 추가 (sendKakaoAlimtalk hook 미리 분리).
 */
export async function dispatchEventNotification(opts: DispatchOpts) {
  try {
    await sendEventNotification(opts)
  } catch (error) {
    // 일정 저장 성공을 알림 실패로 뒤집어 재처리를 유도하지 않는다.
    console.error("[dispatchEventNotification]", error)
    await recordOperationError("push", "eventNotification", error, "notification")
  }
}

async function sendEventNotification(opts: DispatchOpts) {
  const { eventId, type, targetUserId } = opts
  const admin = createAdminClient()

  const snapshot = opts.snapshot ?? await prepareEventNotification(eventId, targetUserId)
  if (snapshot.eventId !== eventId) throw new Error("일정 알림 대상이 일치하지 않습니다.")
  const userIds = [...new Set(snapshot.userIds)]
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
  if (error) {
    console.error("[dispatchEventNotification] in-app:", error)
    await recordOperationError("push", "eventInAppNotification", error, "notification")
  }

  // 이벤트 제목 조회 (Push 메시지용)
  const evTitle = snapshot.title

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
          { title, body, url: type === "event_canceled" ? "/my/applications" : `/calendar/${eventId}`, tag: `event-${type}-${eventId}` },
          uid
        )
      )
    )
  } catch (e) {
    console.error("[dispatchEventNotification push]", e)
    await recordOperationError("push", "eventPushNotification", e, "notification")
  }

  // 카카오 알림톡 — 미래 통합 지점.
  // await sendKakaoAlimtalk({ userIds, eventId, type })
}
