import type { ApplicationStatus } from "@/shared/types/database"

export type ApplicationKind = "volunteer" | "adoption"
export type ApplicationFilter = ApplicationStatus | "처리 필요" | "전체" | "반려·취소"
export type AdminApplicationParams = Record<string, string | string[] | undefined>
export const APPLICATION_STATUSES: ApplicationStatus[] = ["접수", "검토중", "일정변경요청", "승인", "반려", "취소"]
export function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
}
export function parseApplicationFilters(params: AdminApplicationParams) {
  const value = (key: string) => typeof params[key] === "string" ? params[key] as string : ""
  const type: ApplicationKind = value("type") === "adoption" ? "adoption" : "volunteer"
  const candidates: ApplicationFilter[] = ["처리 필요", "전체", "반려·취소", ...APPLICATION_STATUSES]
  const status = candidates.find(s => s === value("status") && !(type === "adoption" && s === "일정변경요청")) ?? "처리 필요"
  const from = value("from"), to = value("to")
  const dateBy = value("dateBy") === "activity" ? "activity" as const : "submitted" as const
  const page = Number(value("page"))
  let error = ""
  if ((from && !validDate(from)) || (to && !validDate(to))) error = "올바른 조회 날짜를 입력해 주세요."
  else if (from && to && from > to) error = "종료일은 시작일 이후로 선택해 주세요."
  else if (dateBy === "activity" && (from || to) && (!from || !to || (Date.parse(to) - Date.parse(from)) / 86400000 > 365)) error = "희망 일정 조회는 시작일과 종료일을 모두 선택해 주세요. 최대 1년까지 조회할 수 있습니다."
  return { type, status, q: value("q").trim().slice(0, 100), from, to, dateBy, sort: value("sort") === "latest" ? "latest" as const : "oldest" as const, page: Number.isSafeInteger(page) && page > 0 && page <= 100000 ? page : 1, error }
}
export type ApplicationFilters = ReturnType<typeof parseApplicationFilters>
export function applicationParams(filters: ApplicationFilters): Record<string, string> {
  return { type: filters.type, status: filters.status, q: filters.q, from: filters.from, to: filters.to, dateBy: filters.dateBy, sort: filters.sort, page: String(filters.page) }
}
export function applicationHref(params: Record<string, string | undefined>) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value)
  return `/admin/applications?${query}`
}
export function applicationReturnHref(value: string | string[] | undefined, kind: ApplicationKind) {
  if (typeof value !== "string" || !value.startsWith("/admin/applications?")) return applicationHref({ type: kind })
  const params = Object.fromEntries(new URLSearchParams(value.slice(value.indexOf("?") + 1)))
  return applicationHref(applicationParams(parseApplicationFilters({ ...params, type: kind })))
}
export function datesInRange(from: string, to: string) {
  if (!validDate(from) || !validDate(to) || from > to || Date.parse(to) - Date.parse(from) > 365 * 86400000) return []
  const dates: string[] = []
  for (let day = Date.parse(from); day <= Date.parse(to); day += 86400000) dates.push(new Date(day).toISOString().slice(0, 10))
  return dates
}
export function applicationDate(value: string, time = false) {
  const date = new Date(value.length === 10 ? `${value}T00:00:00+09:00` : value)
  if (!Number.isFinite(date.getTime())) return "날짜 확인 필요"
  return date.toLocaleString("ko-KR", { timeZone: "Asia/Seoul", year: "2-digit", month: "2-digit", day: "2-digit", ...(time ? { hour: "2-digit", minute: "2-digit", hour12: false } as const : {}) })
}
