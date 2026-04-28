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

  // 카카오 알림톡 — 미래 통합 지점.
  // 발송업체 계약(SOLAPI/알리고 등) 연결되면 여기에 fetch + 템플릿 ID 매핑.
  // await sendKakaoAlimtalk({ userIds, eventId, type })
}
