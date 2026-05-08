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

interface SendOptions {
  /** 제외할 사용자 ID 목록 (작성자 제외 등) */
  excludeUserIds?: string[]
  /** 특정 사용자에게만 발송 (지정 시 다른 조건은 모두 무시) */
  onlyUserIds?: string[]
  /** 마케팅 동의 필터를 건너뛸지 (기본 false). 신청 상태 변경처럼 본인에게 보내는 알림은 true. */
  ignoreMarketingConsent?: boolean
}

/** 내부 공통 발송기 — 조건에 맞는 endpoint들에 푸시 발송 + 만료된 endpoint 정리 */
async function sendPushInternal(
  payload: PushPayload,
  options: SendOptions = {}
): Promise<void> {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return

  const admin = createAdminClient()

  // 발송 대상 user_id 결정
  let targetUserIds: string[] | null = null

  if (options.onlyUserIds && options.onlyUserIds.length > 0) {
    targetUserIds = options.onlyUserIds
  } else if (!options.ignoreMarketingConsent) {
    // 마케팅 동의자만
    const { data: optedIn } = await admin
      .from("profiles")
      .select("id")
      .not("marketing_agreed_at", "is", null)
    targetUserIds = (optedIn ?? []).map((r) => r.id)
  }

  // 제외 사용자 필터
  if (targetUserIds && options.excludeUserIds && options.excludeUserIds.length > 0) {
    const excludeSet = new Set(options.excludeUserIds)
    targetUserIds = targetUserIds.filter((id) => !excludeSet.has(id))
  }

  if (targetUserIds && targetUserIds.length === 0) return

  // 구독 조회
  let query = admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, user_id")
  if (targetUserIds) {
    query = query.in("user_id", targetUserIds)
  }
  const { data: subs } = await query
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

/** 시스템 자동 발송 (마케팅 동의자 전체, 작성자 제외 가능) */
export async function sendPushSystem(
  payload: PushPayload,
  excludeUserId?: string | null
): Promise<void> {
  await sendPushInternal(payload, {
    excludeUserIds: excludeUserId ? [excludeUserId] : undefined,
  })
}

/** 운영진(admin/staff) 전체에게 발송 — 새 신청 알림 등에 사용 (마케팅 동의 무관) */
export async function sendPushToStaff(
  payload: PushPayload,
  excludeUserId?: string | null
): Promise<void> {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return

  const admin = createAdminClient()
  const { data: staff } = await admin
    .from("profiles")
    .select("id")
    .in("role", ["admin", "staff"])

  const ids = (staff ?? [])
    .map((r) => r.id)
    .filter((id) => id !== excludeUserId)
  if (ids.length === 0) return

  await sendPushInternal(payload, {
    onlyUserIds: ids,
    ignoreMarketingConsent: true,
  })
}

/** 특정 회원 한 명에게 발송 — 신청 상태 변경 알림 등 (마케팅 동의 무관) */
export async function sendPushToUser(
  payload: PushPayload,
  userId: string
): Promise<void> {
  await sendPushInternal(payload, {
    onlyUserIds: [userId],
    ignoreMarketingConsent: true,
  })
}
