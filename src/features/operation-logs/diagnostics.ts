import { safeErrorCode } from "./catalog"

export const targetTypes = ["volunteer", "adoption", "event", "notice", "expense", "daily", "story", "document"] as const
export type ErrorContext = { page?: string; targetType?: typeof targetTypes[number]; targetId?: string; action?: string }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function validId(value: unknown): value is string { return typeof value === "string" && uuid.test(value) }
const segments = new Set(["admin", "applications", "application", "volunteer", "adopt", "adoption", "calendar", "events", "notice", "notices", "expenses", "daily", "stories", "community", "dogs", "cats", "members", "my", "settings", "sms", "logs", "upload", "api", "auth", "login", "profile", "about", "donate", "contact", "donations", "new", "edit", "documents", "expense-upload", "expense-attachments", "adoption-documents", "operation-errors"])
/** URL의 쿼리, 대상 ID, 알 수 없는 경로 조각은 절대 저장하지 않는다. */
export function safePage(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "unknown"
  return ("/" + value.split(/[?#]/, 1)[0].split("/").filter(Boolean).slice(0, 8)
    .map(part => segments.has(part) ? part : "[detail]").join("/")).slice(0, 160)
}
export function safeContext(context: ErrorContext = {}) {
  return {
    page: safePage(context.page),
    target_type: targetTypes.includes(context.targetType!) ? context.targetType : null,
    target_id: validId(context.targetId) ? context.targetId : null,
    action: ["approve", "reject", "complete", "cancel", "upload", "download", "create", "update", "delete"].includes(context.action ?? "") ? context.action : null,
  }
}
export function clientEnvironment(ua: string) {
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\/|CriOS\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "unknown"
  const device = /iPad|Tablet/.test(ua) ? "tablet" : /Mobi|iPhone|Android/.test(ua) ? "mobile" : ua ? "desktop" : "unknown"
  return { browser, device }
}
export function pageLabel(page: string): string {
  const exact: Record<string, string> = { "/": "홈", "/adopt": "입양상담 신청", "/volunteer": "봉사 신청", "/my": "마이페이지", "/my/applications": "내 신청 내역", "/admin/applications": "관리자 · 신청 관리", "/admin/logs": "관리자 · 오류 로그" }
  if (exact[page]) return exact[page]
  if (page.includes("/applications/adoption/")) return page.startsWith("/admin") ? "관리자 · 입양 신청 상세" : "내 입양 신청 상세"
  if (page.includes("/applications/volunteer/")) return page.startsWith("/admin") ? "관리자 · 봉사 신청 상세" : "내 봉사 신청"
  const board = /\/(expenses|notices|notice|daily|stories|calendar|dogs|cats|members)(?:\/|$)/.exec(page)?.[1]
  const names: Record<string, string> = { expenses: "지출 내역", notices: "공지사항", notice: "공지사항", daily: "왕왕랜드 이야기", stories: "입양 후기", calendar: "일정", dogs: "강아지 관리", cats: "고양이 관리", members: "회원 관리" }
  if (board) return `${page.startsWith("/admin") ? "관리자 · " : ""}${names[board]}${page.endsWith("/new") ? " 작성" : page.endsWith("/edit") ? " 수정" : page.includes("[detail]") ? " 상세" : ""}`
  return page === "unknown" ? "화면 확인 불가" : "기타 화면"
}
const causes: Record<string, string> = {
  HTTP_401: "인증이 거부되었습니다. 서비스 키와 인증 설정을 확인하세요.",
  HTTP_403: "접근이 거부되었습니다. 저장소·발송 서비스의 권한과 키를 확인하세요.",
  HTTP_413: "서비스에서 허용한 요청 크기를 초과했습니다.", HTTP_429: "서비스 요청 한도를 초과했습니다.",
  HTTP_500: "외부 서비스 내부 오류입니다.", HTTP_502: "외부 서비스 연결 응답 오류입니다.", HTTP_503: "외부 서비스가 일시적으로 응답하지 않습니다.", HTTP_504: "외부 서비스 응답 시간이 초과되었습니다.",
  "23514": "DB 허용값 제약조건에 맞지 않습니다. 상태·알림 유형과 적용 SQL을 확인하세요.",
  "23505": "DB 고유값이 중복되었습니다.", "23503": "연결된 DB 대상이 없거나 삭제되었습니다.",
  "42501": "DB 접근 권한이 없습니다.", "42703": "DB 컬럼이 없습니다. 적용 SQL을 확인하세요.",
  PGRST204: "DB 스키마 캐시에 요청한 컬럼이 없습니다. 적용 SQL과 캐시를 확인하세요.",
  PGRST202: "DB 함수가 없거나 인자가 일치하지 않습니다. 적용 SQL을 확인하세요.",
  TypeError: "값의 형식 또는 네트워크 처리 오류입니다. 발생 위치와 서버 로그를 확인하세요.",
  SyntaxError: "응답 또는 데이터 구문 해석에 실패했습니다.", RangeError: "값의 허용 범위를 벗어났습니다.",
  TimeoutError: "처리 제한 시간을 초과했습니다.", AbortError: "요청이 중단되었습니다.",
  ETIMEDOUT: "네트워크 연결 시간이 초과되었습니다.", ECONNRESET: "상대 서버가 연결을 끊었습니다.",
  ECONNREFUSED: "서버 연결이 거부되었습니다.", ENOTFOUND: "서버 주소를 찾지 못했습니다.", EAI_AGAIN: "서버 주소 조회에 일시적으로 실패했습니다.",
}
export function diagnostic(error: unknown, step: string) {
  const e = error && typeof error === "object" ? error as { name?: unknown; stack?: unknown } : {}
  const blobNames = ["BlobAccessError", "BlobStoreNotFoundError", "BlobNotFoundError", "BlobServiceNotAvailable", "BlobFileTooLargeError", "BlobClientTokenExpiredError"]
  const name = typeof e.name === "string" && blobNames.includes(e.name) ? e.name : null
  const code = name ? name.replace(/^Blob/, "").replace(/Error$/, "") : safeErrorCode(error)
  const description = step === "privateStorageConfiguration" ? "BLOB_PRIVATE_READ_WRITE_TOKEN이 배포 환경에 없습니다."
    : name === "BlobAccessError" ? "Blob 저장소 인증·접근이 거부되었습니다. 비공개 저장소 키를 확인하세요."
    : name ? `Blob 저장소 오류: ${name}` : causes[code] ?? "분류되지 않은 오류입니다. 추적번호·발생 위치로 서버 로그를 확인하세요."
  // 메시지·SQL 상세·전체 스택은 저장하지 않는다. 빌드 코드 파일/행/열만 추출한다.
  const locations = typeof e.stack === "string" ? e.stack.split("\n").slice(1, 12).flatMap(line => {
    const match = line.match(/(?:\/|\\)([a-zA-Z0-9_.-]+\.(?:js|mjs|cjs|ts|tsx)):(\d{1,8}):(\d{1,8})(?:\)|$)/)
    return match ? [`${match[1]}:${match[2]}:${match[3]}`] : []
  }).slice(0, 4) : []
  return { code, description, location: locations.join("\n") || null }
}
export function targetHref(type: string | null, id: string | null): string | null {
  if (!validId(id)) return null
  const prefixes: Record<string, string> = { volunteer: "/admin/applications/volunteer/", adoption: "/admin/applications/adoption/", event: "/admin/calendar/", notice: "/admin/notices/", expense: "/admin/expenses/", daily: "/admin/daily/", story: "/admin/stories/" }
  return prefixes[type ?? ""] ? `${prefixes[type!]}${id}${["notice", "expense", "daily", "story"].includes(type!) ? "/edit" : ""}` : null
}
