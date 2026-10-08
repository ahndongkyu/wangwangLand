/** 고정된 기능명과 오류 분류만 기록한다. 입력값·오류 본문·URL은 받지 않는다. */
export const operations = {
  application: "신청 저장·처리",
  calendar: "봉사·행사 일정 처리",
  post: "게시글 저장·삭제",
  upload: "파일 업로드",
  push: "푸시·신청 알림",
  sms: "문자 발송",
  query: "데이터 조회",
  server: "서버 처리",
  browser: "화면 오류",
} as const
export type Operation = keyof typeof operations
export const logStatuses = { open: "미확인", investigating: "확인 중", resolved: "해결" } as const
export type LogStatus = keyof typeof logStatuses
const stepLabels: Record<string, string> = {
  submitVolunteerApplication: "봉사 신청 저장 실패", updateVolunteerApplication: "봉사 승인·상태 처리 실패",
  updateMyVolunteerApplication: "내 봉사 신청 수정 실패", requestReschedule: "일정 변경 요청 실패",
  submitAdoptionApplication: "입양 신청 저장 실패", updateAdoptionApplication: "입양 신청 처리 실패",
  cancelOwnVolunteerApplication: "봉사 취소 처리 실패", cancelOwnAdoptionApplication: "입양 취소 처리 실패",
  deleteVolunteerApplication: "봉사 신청 삭제 실패", deleteAdoptionApplication: "입양 신청 삭제 실패",
  createDailyPost: "이야기 등록 실패", updateDailyPost: "이야기 수정 실패", deleteDailyPost: "이야기 삭제 실패", bulkDeleteDailyPosts: "이야기 일괄 삭제 실패",
  createNotice: "공지·지출 등록 실패", updateNotice: "공지·지출 수정 실패", deleteNotice: "공지·지출 삭제 실패", bulkDeleteNotices: "공지·지출 일괄 삭제 실패",
  createAdoptionStory: "입양 후기 등록 실패", updateAdoptionStory: "입양 후기 수정 실패", deleteAdoptionStory: "입양 후기 삭제 실패", bulkDeleteAdoptionStories: "입양 후기 일괄 삭제 실패",
  createEvent: "일정 등록 실패", createMultiDateEvents: "봉사 일정 등록 실패", createRecurringEvents: "반복 일정 등록 실패", updateEvent: "일정 수정 실패", "updateEvent recurring": "반복 일정 수정 실패", deleteEvent: "일정 삭제 실패",
  publicUpload: "이미지 업로드 실패", privateUploadToken: "첨부파일 업로드 준비 실패", privateStorageConfiguration: "첨부파일 저장소 설정 누락",
  requestLog: "문자 요청 기록 저장 실패", resultLog: "문자 결과 기록 저장 실패", failed: "문자 발송 실패", unknown: "문자 접수 결과 확인 필요",
  deliveryLookup: "문자 전달 결과 조회 실패",
  volunteerInAppNotification: "봉사 신청 알림 저장 실패", adoptionInAppNotification: "입양 신청 알림 저장 실패",
  configuration: "발송 설정 누락", automaticDelivery: "자동 푸시 전송 실패", broadcastDelivery: "전체 푸시 전송 실패",
  boundary: "화면 표시 실패", unhandled: "브라우저 처리 오류", upload: "브라우저 파일 업로드 실패",
  applicationCounts: "신청 집계 조회 실패", applicationList: "신청 목록 조회 실패", applicationLinkedEvents: "연결 일정 조회 실패",
  volunteerGroupDates: "정기 봉사 제한 조회 실패", confirmedSchedule: "확정 일정 조회 실패",
}
export function errorSummary(operation: Operation, step: string) {
  return stepLabels[step] ?? `${operations[operation]} 중 오류 발생`
}
export const areas = ["public", "admin", "application", "calendar", "post", "upload", "notification"] as const
export type LogArea = typeof areas[number]

export function logArea(pathname: string): LogArea {
  const path = pathname.split(/[?#]/, 1)[0]
  if (/\/applications?(\/|$)|\/volunteer(\/|$)|\/adoption(\/|$)/.test(path)) return "application"
  if (/\/calendar(\/|$)|\/events(\/|$)/.test(path)) return "calendar"
  if (/\/(notice|notices|daily|stories|community|expenses)(\/|$)/.test(path)) return "post"
  return path.startsWith("/admin") ? "admin" : "public"
}

export function serverErrorStep(routeType: string, routePath: string): string {
  const segments = new Set(["admin", "applications", "volunteer", "adoption", "calendar", "notice", "notices", "expenses", "daily", "stories", "community", "dogs", "cats", "members", "my", "settings", "sms", "logs", "upload", "api", "auth", "login", "profile", "about", "donations", "new", "edit"])
  const route = routePath.split("/").filter(Boolean).map(s => segments.has(s) ? s : s.startsWith("[") ? "detail" : "page").join(".")
  const kind = ["render", "route", "action", "proxy"].includes(routeType) ? routeType : "request"
  return `${kind}.${route || "home"}`.slice(0, 80)
}

// 허용 목록 외 코드는 버린다. SQL 오류 message/details에는 입력값이 포함될 수 있다.
export function safeErrorCode(error: unknown): string {
  if (!error || typeof error !== "object") return "UNKNOWN"
  const e = error as { code?: unknown; name?: unknown; statusCode?: unknown }
  if (typeof e.code === "string" && /^(?:PGRST\d{3}|(?:08|22|23|28|40|42|53|54|55|57|58|XX)[0-9A-Z]{3})$/.test(e.code)) return e.code
  if ([400, 401, 403, 408, 413, 429, 500, 502, 503, 504].includes(Number(e.statusCode))) return `HTTP_${Number(e.statusCode)}`
  if (["AbortError", "TimeoutError", "TypeError", "RangeError", "SyntaxError"].includes(String(e.name))) return String(e.name)
  return "UNKNOWN"
}

export interface OperationLog {
  id: string
  operation: Operation
  step: string
  code: string
  area: LogArea
  status: LogStatus
  occurrences: number
  recurrences: number
  first_seen_at: string
  last_seen_at: string
  status_changed_at: string | null
}
