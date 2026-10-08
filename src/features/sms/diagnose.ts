"use server"

import crypto from "crypto"
import { requireTopAdmin } from "@/shared/lib/auth"
import { createAdminClient } from "@/shared/lib/supabase/admin"

// 기존 운영 테스트 기록만 허용하며 대상 ID를 사용자 입력으로 받지 않는다.
const TEST_LOG_IDS = ["ac874de9-d1c5-499b-8491-6500bdb08dc1", "7d0c0854-9e84-42ed-a461-1672e3e5e4fb"]
const TEST_APPLICATION_ID = "8b550f63-8366-464a-bcc8-354218f382ef"

export interface SmsDiagnosticRow {
  label: string
  httpStatus: number | null
  listShape: "object" | "array" | "missing" | "invalid"
  returnedCount: number
  hasNextPage: boolean
  matches: { label: string; keyMatched: boolean; fieldMatched: boolean; keyStatus: string | null; fieldStatus: string | null }[]
  error?: string
}
export interface SmsDiagnosticResult {
  checkedAt?: string
  rows?: SmsDiagnosticRow[]
  error?: string
}
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}
function statusCode(value: unknown): string | null {
  return (typeof value === "number" || typeof value === "string") && /^\d{4}$/.test(String(value)) ? String(value) : null
}

/** 키·개인정보·원본 응답은 반환하거나 로그로 남기지 않는다. GET 조회만 수행한다. */
export async function diagnoseTestSmsDelivery(): Promise<SmsDiagnosticResult> {
  const auth = await requireTopAdmin()
  if (!auth.ok) return { error: auth.error }
  const apiKey = process.env.SOLAPI_API_KEY
  const apiSecret = process.env.SOLAPI_API_SECRET
  if (!apiKey || !apiSecret) return { error: "운영 서버의 문자 조회 설정을 확인해주세요." }
  const { data, error } = await createAdminClient().from("sms_delivery_logs")
    .select("id, provider_message_id").in("id", TEST_LOG_IDS)
    .eq("application_id", TEST_APPLICATION_ID).limit(2)
  const ids = TEST_LOG_IDS.map(id => data?.find(row => row.id === id)?.provider_message_id)
  if (error || ids.some(id => typeof id !== "string" || !/^M[A-Za-z0-9]{10,64}$/.test(id)) || new Set(ids).size !== 2) {
    return { error: "기존 테스트 문자 2건의 메시지 ID를 확인하지 못했습니다. 다른 문자는 조회하지 않았습니다." }
  }
  const messageIds = ids as string[]
  async function query(label: string, params: Record<string, string>, requested: string[]): Promise<SmsDiagnosticRow> {
    const row: SmsDiagnosticRow = { label, httpStatus: null, listShape: "missing", returnedCount: 0, hasNextPage: false, matches: [] }
    try {
      const date = new Date().toISOString()
      const salt = crypto.randomBytes(16).toString("hex")
      const signature = crypto.createHmac("sha256", apiSecret!).update(date + salt).digest("hex")
      const response = await fetch(`https://api.solapi.com/messages/v4/list?${new URLSearchParams(params)}`, {
        method: "GET", cache: "no-store", signal: AbortSignal.timeout(10000),
        headers: { Authorization: `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}` },
      })
      row.httpStatus = response.status
      if (!response.ok) return { ...row, error: "제공업체가 조회 요청을 거절했습니다. HTTP 상태를 확인해주세요." }
      let body: unknown
      try { body = await response.json() }
      catch { return { ...row, error: "응답을 JSON으로 해석하지 못했습니다." } }
      if (!record(body)) return { ...row, listShape: "invalid", error: "최상위 응답 형식이 예상과 다릅니다." }
      const list = body.messageList
      row.listShape = Array.isArray(list) ? "array" : record(list) ? "object" : list == null ? "missing" : "invalid"
      const entries = record(list) || Array.isArray(list) ? Object.entries(list) : []
      row.returnedCount = entries.length
      row.hasNextPage = typeof body.nextKey === "string" && body.nextKey.length > 0
      row.matches = requested.map(id => {
        const keyed = record(list) && Object.hasOwn(list, id) ? list[id] : undefined
        const field = entries.map(([, value]) => value).find(value => record(value) && value.messageId === id)
        return {
          label: `테스트 ${messageIds.indexOf(id) + 1}`, keyMatched: record(keyed), fieldMatched: record(field),
          keyStatus: record(keyed) ? statusCode(keyed.statusCode) : null,
          fieldStatus: record(field) ? statusCode(field.statusCode) : null,
        }
      })
      return row
    } catch {
      return { ...row, error: "조회 통신 실패 또는 시간 초과입니다. 재발송하지 않았습니다." }
    }
  }
  const rows = await Promise.all([
    query("현재 일괄 조회", { messageIds: JSON.stringify(messageIds), limit: "20" }, messageIds),
    ...messageIds.map((id, index) => query(`단건 조회 · 테스트 ${index + 1}`, { criteria: "messageId", cond: "eq", value: id, limit: "1" }, [id])),
  ])
  return { checkedAt: new Date().toISOString(), rows }
}
