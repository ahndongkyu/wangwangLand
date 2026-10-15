import "server-only"
import { headers } from "next/headers"
import { createClient } from "@/shared/lib/supabase/server"
import { clientEnvironment, safePage } from "./diagnostics"

/** 인증 실패 시 회원을 추측하지 않는다. 오류 수집을 위해 입력값/쿠키를 저장하지 않는다. */
export async function requestLogContext() {
  const h = await headers()
  let page = "unknown"
  try {
    const referer = new URL(h.get("referer") ?? "")
    if (referer.host === h.get("host")) page = safePage(referer.pathname)
  } catch { /* 요청 출처가 없는 서버 작업 */ }
  const result = { page, ...clientEnvironment(h.get("user-agent") ?? ""), actor_id: null as string | null, actor_state: "unknown" }
  try {
    const client = await createClient()
    const { data, error } = await client.auth.getUser()
    if (!error && data.user) result.actor_id = data.user.id
    else if (!error || error.name === "AuthSessionMissingError") result.actor_state = "anonymous"
  } catch { /* 인증 확인 불가 */ }
  return result
}
