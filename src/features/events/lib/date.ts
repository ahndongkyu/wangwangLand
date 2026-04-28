/**
 * KST 기준 캘린더 유틸. 한국 보호소이므로 모든 날짜 계산은 KST.
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000

/** UTC ISO → KST Date (UTC 컴포넌트가 KST 값) */
export function toKst(iso: string): Date {
  return new Date(new Date(iso).getTime() + KST_OFFSET_MS)
}

/** "2026-04" → 해당 월 1일 KST 의 UTC ISO + 다음 달 1일 ISO */
export function monthRange(yearMonth: string): { from: string; to: string } {
  const [y, m] = yearMonth.split("-").map(Number)
  const fromKst = `${yearMonth}-01T00:00:00+09:00`
  const ny = m === 12 ? y + 1 : y
  const nm = m === 12 ? 1 : m + 1
  const toKst = `${ny}-${String(nm).padStart(2, "0")}-01T00:00:00+09:00`
  return {
    from: new Date(fromKst).toISOString(),
    to: new Date(toKst).toISOString(),
  }
}

/** 월간 그리드: 해당 월이 보이는 7×6 = 42 칸을 일요일 시작으로 채움 */
export function monthGridDays(yearMonth: string): Date[] {
  const [y, m] = yearMonth.split("-").map(Number)
  // 해당 월 1일 KST 자정
  const first = new Date(`${yearMonth}-01T00:00:00+09:00`)
  // 그리드 시작: 같은 주의 일요일
  const firstKst = new Date(first.getTime() + KST_OFFSET_MS)
  const dayOfWeek = firstKst.getUTCDay() // 0=일
  const start = new Date(first.getTime() - dayOfWeek * 86400000)

  const days: Date[] = []
  for (let i = 0; i < 42; i++) {
    days.push(new Date(start.getTime() + i * 86400000))
  }
  return days
}

/** YYYY-MM (KST) */
export function yearMonthKst(d: Date): string {
  const kst = new Date(d.getTime() + KST_OFFSET_MS)
  return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, "0")}`
}

/** YYYY-MM-DD (KST) */
export function dateKey(d: Date): string {
  const kst = new Date(d.getTime() + KST_OFFSET_MS)
  return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, "0")}-${String(kst.getUTCDate()).padStart(2, "0")}`
}

/** "오늘" KST */
export function todayKst(): Date {
  const now = new Date()
  const kstNow = new Date(now.getTime() + KST_OFFSET_MS)
  return new Date(
    Date.UTC(
      kstNow.getUTCFullYear(),
      kstNow.getUTCMonth(),
      kstNow.getUTCDate()
    ) - KST_OFFSET_MS
  )
}

/** YYYY-MM 기준 다음/이전 월 */
export function shiftMonth(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split("-").map(Number)
  const total = y * 12 + (m - 1) + delta
  const ny = Math.floor(total / 12)
  const nm = (total % 12) + 1
  return `${ny}-${String(nm).padStart(2, "0")}`
}

/** "4월 30일 (수)" 식 한국어 일자 */
export function formatKoreanDayLabel(iso: string, allDay = false): string {
  const d = toKst(iso)
  const month = d.getUTCMonth() + 1
  const day = d.getUTCDate()
  const dow = ["일", "월", "화", "수", "목", "금", "토"][d.getUTCDay()]
  if (allDay) return `${month}월 ${day}일 (${dow}) 종일`
  const h = d.getUTCHours()
  const min = d.getUTCMinutes()
  const ampm = h < 12 ? "오전" : "오후"
  const hh = ((h + 11) % 12) + 1
  const mm = min === 0 ? "" : `:${String(min).padStart(2, "0")}`
  return `${month}월 ${day}일 (${dow}) ${ampm} ${hh}${mm}시`
}

/** 09:30 같은 시간만 */
export function formatTimeKst(iso: string): string {
  const d = toKst(iso)
  const h = d.getUTCHours()
  const min = d.getUTCMinutes()
  const ampm = h < 12 ? "오전" : "오후"
  const hh = ((h + 11) % 12) + 1
  const mm = String(min).padStart(2, "0")
  return `${ampm} ${hh}:${mm}`
}

export function isSameMonth(d: Date, yearMonth: string): boolean {
  const ym = yearMonthKst(d)
  return ym === yearMonth
}

export function isToday(d: Date): boolean {
  return dateKey(d) === dateKey(todayKst())
}
