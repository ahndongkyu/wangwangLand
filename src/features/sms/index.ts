import "server-only"

import crypto from "crypto"
import { createAdminClient } from "@/shared/lib/supabase/admin"
import { requireAdmin } from "@/shared/lib/auth"
import { recordOperationError } from "@/features/operation-logs/server"

function makeAuthHeader(apiKey: string, apiSecret: string): string {
  const date = new Date().toISOString()
  const salt = crypto.randomBytes(16).toString("hex")
  const signature = crypto
    .createHmac("sha256", apiSecret)
    .update(date + salt)
    .digest("hex")
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`
}

/**
 * 솔라피 SMS 발송.
 * SOLAPI_API_KEY / SOLAPI_API_SECRET / SOLAPI_SENDER_NUMBER 환경변수 필요.
 * 요청 이력을 먼저 저장한다. 네트워크 오류는 중복 발송 방지를 위해 자동 재시도하지 않는다.
 */
export async function sendSms(to: string, text: string, context?: {
  applicationId: string
  applicationType: "volunteer" | "adoption"
  recipientName: string
  messageType?: "SMS" | "LMS"
}): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin()
  if (!auth.ok) return { ok: false, error: auth.error }
  const apiKey = process.env.SOLAPI_API_KEY
  const apiSecret = process.env.SOLAPI_API_SECRET
  const from = process.env.SOLAPI_SENDER_NUMBER

  const toClean = to.replace(/\D/g, "")
  const admin = createAdminClient()
  const configured = !!(apiKey && apiSecret && from)
  const { data: log, error: logError } = await admin.from("sms_delivery_logs").insert({
    recipient_phone: toClean, recipient_name: context?.recipientName ?? null,
    message: text, application_id: context?.applicationId ?? null,
    application_type: context?.applicationType ?? null, created_by: auth.userId,
    state: configured ? "pending" : "failed",
    error_message: configured ? null : "문자 발송 환경변수가 설정되지 않았습니다.",
  }).select("id").single()
  if (logError || !log) {
    await recordOperationError("sms", "requestLog", logError, "notification")
    return { ok: false, error: "문자 발송 기록을 저장하지 못해 발송하지 않았습니다." }
  }
  const logId = log.id
  if (!apiKey || !apiSecret || !from) {
    await recordOperationError("sms", "configuration", undefined, "notification")
    return { ok: false, error: "문자 발송 설정이 필요합니다." }
  }

  async function finish(state: string, errorMessage: string | null, messageId?: string) {
    const { error } = await admin.from("sms_delivery_logs").update({
      state, error_message: errorMessage, provider_message_id: messageId ?? null,
    }).eq("id", logId)
    if (error) await recordOperationError("sms", "resultLog", error, "notification")
    if (state === "failed" || state === "unknown") await recordOperationError("sms", state, undefined, "notification")
  }

  try {
    const res = await fetch("https://api.solapi.com/messages/v4/send-many/detail", {
      method: "POST",
      signal: AbortSignal.timeout(15000),
      headers: {
        "Content-Type": "application/json",
        Authorization: makeAuthHeader(apiKey, apiSecret),
      },
      body: JSON.stringify({
        messages: [{ to: toClean, from, text, ...(context?.messageType ? { type: context.messageType, autoTypeDetect: false } : {}) }],
        showMessageList: true,
      }),
    })

    if (!res.ok) {
      await finish("failed", `문자 제공업체 요청 실패 (HTTP ${res.status})`)
      return { ok: false, error: "문자 발송 요청에 실패했습니다." }
    }
    const body = await res.json()
    const failed = body.failedMessageList?.[0]
    if (failed) {
      await finish("failed", String(failed.statusMessage ?? "문자 접수가 거절되었습니다."), failed.messageId)
      return { ok: false, error: "문자 접수가 거절되었습니다." }
    }
    const result = body.messageList?.[0]
    if (!result || typeof result.messageId !== "string") {
      await finish("unknown", "응답에 메시지 ID가 없어 실제 발송 결과 확인이 필요합니다.")
      return { ok: false, error: "문자 발송 결과를 확인할 수 없습니다." }
    }
    await finish("accepted", null, result.messageId)
    return { ok: true }
  } catch {
    await finish("unknown", "통신이 중단되었습니다. 재발송 전 제공업체에서 발송 여부를 확인해주세요.")
    return { ok: false, error: "문자 발송 결과를 확인할 수 없습니다." }
  }
}

export async function getSmsDeliveryReports(messageIds: string[]) {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error, reports: {} }
  const apiKey = process.env.SOLAPI_API_KEY
  const apiSecret = process.env.SOLAPI_API_SECRET
  if (!apiKey || !apiSecret) return { error: "문자 제공업체 연결 설정이 필요합니다.", reports: {} }
  if (!messageIds.length) return { reports: {} }
  try {
    const requestedIds = [...new Set(messageIds.filter(id => typeof id === "string" && id.length > 0))].slice(0, 20)
    if (!requestedIds.length) return { reports: {} }
    const query = new URLSearchParams({ messageIds: JSON.stringify(requestedIds), limit: "20" })
    const response = await fetch(`https://api.solapi.com/messages/v4/list?${query}`, {
      headers: { Authorization: makeAuthHeader(apiKey, apiSecret) },
      cache: "no-store", signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) throw new Error("Provider unavailable")
    const body = await response.json()
    if (!body.messageList || typeof body.messageList !== "object" || Array.isArray(body.messageList)) throw new Error("Invalid response")
    const reports: Record<string, { statusCode?: string; reason?: string; dateReported?: string }> = {}
    function collect(id: string, report: unknown) {
      if (!report || typeof report !== "object" || Array.isArray(report)) return
      const item = report as Record<string, unknown>
      if (typeof item.messageId === "string" && item.messageId !== id) return
      const code = item.statusCode
      reports[id] = {
        statusCode: typeof code === "string" || typeof code === "number" ? String(code) : undefined,
        reason: typeof item.reason === "string" ? item.reason : undefined,
        dateReported: typeof item.dateReported === "string" ? item.dateReported : undefined,
      }
    }
    for (const id of requestedIds) collect(id, body.messageList[id])

    // 운영 응답에서 일괄 검색은 빈 목록, 동일 ID의 eq 검색은 4000을 반환한 사례 보완.
    // 조회된 결과는 유지하고 누락된 ID만 조회한다. 발송 API나 DB 쓰기는 호출하지 않는다.
    const missingIds = requestedIds.filter(id => !reports[id]?.statusCode)
    if (missingIds.length) {
      const signal = AbortSignal.timeout(10000)
      let next = 0
      async function lookupMissing() {
        while (next < missingIds.length && !signal.aborted) {
          const id = missingIds[next++]
          try {
            const params = new URLSearchParams({ criteria: "messageId", cond: "eq", value: id, limit: "1" })
            const single = await fetch(`https://api.solapi.com/messages/v4/list?${params}`, {
              method: "GET", cache: "no-store", signal,
              headers: { Authorization: makeAuthHeader(apiKey!, apiSecret!) },
            })
            if (!single.ok) continue
            const result = await single.json()
            if (result?.messageList && typeof result.messageList === "object" && !Array.isArray(result.messageList)) {
              collect(id, result.messageList[id])
            }
          } catch {
            // 일부 단건 조회가 실패해도 다른 문자의 확인된 전달 결과를 지우지 않는다.
          }
        }
      }
      await Promise.all(Array.from({ length: Math.min(4, missingIds.length) }, () => lookupMissing()))
    }
    const missing = requestedIds.some(id => !reports[id]?.statusCode)
    return { reports, ...(missing ? { error: "일부 문자의 전달 결과가 조회되지 않았습니다. 접수 기록만으로 전달 완료 여부를 판단하거나 재발송하지 마세요." } : {}) }
  } catch (error) {
    await recordOperationError("sms", "deliveryLookup", error, "notification")
    return { error: "최신 전달 결과를 조회하지 못했습니다. 저장된 요청 기록을 표시합니다.", reports: {} }
  }
}
