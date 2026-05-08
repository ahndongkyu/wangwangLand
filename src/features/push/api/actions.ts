"use server"

import webpush from "web-push"
import { createClient } from "@/shared/lib/supabase/server"
import { createAdminClient } from "@/shared/lib/supabase/admin"
import { SITE } from "@/shared/constants/site"

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || SITE.url

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
}

export interface PushPayload {
  title: string
  body: string
  url?: string
  icon?: string
  image?: string
  tag?: string
}

interface SubscribeInput {
  endpoint: string
  p256dh: string
  auth: string
  userAgent?: string
}

/** 구독 등록 (로그인/비로그인 모두) */
export async function subscribePush(input: SubscribeInput): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // upsert by endpoint
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user?.id ?? null,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        user_agent: input.userAgent ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" }
    )

  if (error) {
    console.error("[subscribePush]", error)
    return { error: error.message }
  }
  return {}
}

/** 구독 해제 */
export async function unsubscribePush(endpoint: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint)
  if (error) return { error: error.message }
  return {}
}

/** 모든 구독자에게 푸시 발송 (운영진만) */
export async function sendPushToAll(payload: PushPayload): Promise<{ sent: number; failed: number; error?: string }> {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return { sent: 0, failed: 0, error: "VAPID 키가 설정되지 않았습니다." }
  }

  // 권한 체크
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { sent: 0, failed: 0, error: "로그인이 필요합니다." }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()
  if (!profile || (profile.role !== "admin" && profile.role !== "staff")) {
    return { sent: 0, failed: 0, error: "권한이 없습니다." }
  }

  // RLS 우회 (admin client) — 모든 구독자 조회
  const admin = createAdminClient()
  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
  if (error) return { sent: 0, failed: 0, error: error.message }
  if (!subs || subs.length === 0) return { sent: 0, failed: 0 }

  let sent = 0
  let failed = 0
  const expiredIds: string[] = []

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        )
        sent++
      } catch (e) {
        failed++
        // 410 Gone / 404 → 만료된 구독
        const statusCode = (e as { statusCode?: number }).statusCode
        if (statusCode === 410 || statusCode === 404) {
          expiredIds.push(sub.id)
        }
      }
    })
  )

  // 만료된 구독 정리
  if (expiredIds.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", expiredIds)
  }

  return { sent, failed }
}

/** 시스템 자동 발송 (서버 액션 내부에서 호출. 운영진 권한 체크 없음).
 *  마케팅 수신 동의(profiles.marketing_agreed_at IS NOT NULL)한 회원에게만 발송.
 */
export async function sendPushSystem(payload: PushPayload): Promise<void> {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return

  const admin = createAdminClient()

  // 마케팅 동의한 사용자 ID 조회
  const { data: optedIn } = await admin
    .from("profiles")
    .select("id")
    .not("marketing_agreed_at", "is", null)
  const allowedUserIds = new Set((optedIn ?? []).map((r) => r.id))

  if (allowedUserIds.size === 0) return

  // 동의자의 구독만 가져오기
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, user_id")
    .in("user_id", Array.from(allowedUserIds))
  if (!subs || subs.length === 0) return

  const expiredIds: string[] = []

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        )
      } catch (e) {
        const statusCode = (e as { statusCode?: number }).statusCode
        if (statusCode === 410 || statusCode === 404) {
          expiredIds.push(sub.id)
        }
      }
    })
  )

  if (expiredIds.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", expiredIds)
  }
}
