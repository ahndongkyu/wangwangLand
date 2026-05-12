"use server"

import crypto from "crypto"

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
 * 미설정 시 조용히 스킵 (개발 환경 등).
 */
export async function sendSms(to: string, text: string): Promise<void> {
  const apiKey = process.env.SOLAPI_API_KEY
  const apiSecret = process.env.SOLAPI_API_SECRET
  const from = process.env.SOLAPI_SENDER_NUMBER

  if (!apiKey || !apiSecret || !from) return

  // 하이픈 제거 (솔라피는 숫자만)
  const toClean = to.replace(/-/g, "")

  try {
    const res = await fetch("https://api.solapi.com/messages/v4/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: makeAuthHeader(apiKey, apiSecret),
      },
      body: JSON.stringify({
        message: { to: toClean, from, text },
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error("[sendSms] failed", res.status, body)
    }
  } catch (e) {
    console.error("[sendSms] error", e)
  }
}
