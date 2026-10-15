import { recordOperationError } from "@/features/operation-logs/server"
import { areas, logPages, type LogArea } from "@/features/operation-logs/catalog"

// 종류·영역·페이지·코드 모두 허용 목록으로 제한한다.
const recentReports = new Map<string, number>()

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return new Response(null, { status: 403 })
  if (!request.headers.get("content-type")?.startsWith("application/json")) return new Response(null, { status: 415 })
  // 비회원 화면도 신고 가능. 임의 텍스트는 저장하지 않고 DB에서 영역별 빈도를 제한한다.
  const reader = request.body?.getReader()
  if (!reader) return new Response(null, { status: 400 })
  try {
    let size = 0
    let text = ""
    const decoder = new TextDecoder()
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      size += chunk.value.byteLength
      if (size > 512) { await reader.cancel(); return new Response(null, { status: 413 }) }
      text += decoder.decode(chunk.value, { stream: true })
    }
    text += decoder.decode()
    const body = JSON.parse(text)
    if (!body || !["boundary", "unhandled", "upload"].includes(body.kind) || !areas.includes(body.area)) return new Response(null, { status: 400 })
    const page = logPages.includes(body.page) ? body.page : "other"
    const code = ["TypeError", "RangeError", "SyntaxError", "AbortError", "TimeoutError"].includes(body.code) ? body.code : "UNKNOWN"
    const key = `${body.kind}:${body.area}:${page}:${code}`
    if (Date.now() - (recentReports.get(key) ?? 0) < 60000) return new Response(null, { status: 204 })
    recentReports.set(key, Date.now())
    await recordOperationError("browser", `${body.kind}.${page}`, { name: code }, body.area as LogArea)
    return new Response(null, { status: 204 })
  } catch { return new Response(null, { status: 400 }) }
}
