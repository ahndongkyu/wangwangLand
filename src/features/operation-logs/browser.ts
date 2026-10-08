import { logArea } from "./catalog"

const recent = new Map<string, number>()
export function reportBrowserError(kind: "boundary" | "unhandled" | "upload") {
  try {
    const area = logArea(window.location.pathname)
    const key = `${kind}:${area}`
    if (Date.now() - (recent.get(key) ?? 0) < 60000) return
    recent.set(key, Date.now())
    // 오류 본문·스택·입력값·쿼리스트링·회원 정보를 보내지 않는다.
    void fetch("/api/operation-errors", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, area }), keepalive: true,
    }).catch(() => {})
  } catch { /* 기록 실패로 화면 처리를 방해하지 않는다. */ }
}
