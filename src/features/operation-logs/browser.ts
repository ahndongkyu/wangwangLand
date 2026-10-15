import { logArea, browserPage, safeErrorCode } from "./catalog"
import { diagnostic, safePage } from "./diagnostics"

const recent = new Map<string, number>()
export function reportBrowserError(kind: "boundary" | "unhandled" | "upload", error?: unknown) {
  try {
    const area = logArea(window.location.pathname)
    const page = browserPage(window.location.pathname)
    const code = safeErrorCode(error)
    const location = diagnostic(error, kind).location?.split("\n")[0]?.slice(0, 160)
    const key = `${kind}:${area}:${page}:${code}`
    if (Date.now() - (recent.get(key) ?? 0) < 60000) return
    recent.set(key, Date.now())
    // 오류 본문·스택·입력값·쿼리스트링·회원 정보를 보내지 않는다.
    void fetch("/api/operation-errors", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, area, page, code, route: safePage(window.location.pathname), location }), keepalive: true,
    }).catch(() => {})
  } catch { /* 기록 실패로 화면 처리를 방해하지 않는다. */ }
}
