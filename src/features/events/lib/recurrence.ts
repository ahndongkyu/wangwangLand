// 반복(정기) 일정 — 날짜 생성 순수 로직.
// 클라이언트 미리보기와 서버 생성이 동일 규칙을 쓰도록 공유.

export type RecurrenceMode = "none" | "weekly" | "monthly"
export type MonthlyMode = "bydate" | "bydow"

export interface RecurrenceRule {
  mode: RecurrenceMode
  /** weekly: 반복 요일 (0=일 ~ 6=토) */
  weekdays?: number[]
  monthlyMode?: MonthlyMode
  /** bydate: 매월 N일 (1~31) */
  monthDay?: number
  /** bydow: 몇째 주 (1~4, -1=마지막) */
  nth?: number
  /** bydow: 요일 (0=일 ~ 6=토) */
  nthWeekday?: number
  /** 종료 날짜 (YYYY-MM-DD, 포함) */
  until: string
}

/** 폭주 방지 상한. */
export const MAX_OCCURRENCE_MONTHS = 6
export const MAX_OCCURRENCES = 100

function ymd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** 해당 월의 N째 주 특정 요일 날짜. 없으면 null. nth=-1 이면 마지막. */
function nthWeekdayOfMonth(
  year: number,
  month: number,
  dow: number,
  nth: number
): Date | null {
  if (nth === -1) {
    const last = new Date(year, month + 1, 0)
    const off = (last.getDay() - dow + 7) % 7
    return new Date(year, month, last.getDate() - off)
  }
  const first = new Date(year, month, 1)
  const off = (dow - first.getDay() + 7) % 7
  const day = 1 + off + (nth - 1) * 7
  const d = new Date(year, month, day)
  return d.getMonth() === month ? d : null
}

/**
 * 시작 날짜(YYYY-MM-DD)와 규칙으로 반복 날짜 목록(YYYY-MM-DD[]) 생성.
 * 시작일 이상 ~ 종료일(또는 6개월 cap) 이하, 최대 100건.
 */
export function generateOccurrenceDates(
  startDate: string,
  rule: RecurrenceRule
): string[] {
  if (rule.mode === "none") return []
  const [sy, sm, sd] = startDate.split("-").map(Number)
  if (!sy || !sm || !sd) return []
  const start = new Date(sy, sm - 1, sd)

  const cap = new Date(sy, sm - 1 + MAX_OCCURRENCE_MONTHS, sd)
  let until = cap
  if (rule.until) {
    const [uy, um, ud] = rule.until.split("-").map(Number)
    if (uy && um && ud) {
      const u = new Date(uy, um - 1, ud)
      if (u < cap) until = u
    }
  }

  const out: string[] = []

  if (rule.mode === "weekly") {
    const dows = new Set(rule.weekdays ?? [])
    if (dows.size === 0) return []
    for (let i = 0; i < 400 && out.length < MAX_OCCURRENCES; i++) {
      const d = new Date(sy, sm - 1, sd + i)
      if (d > until) break
      if (dows.has(d.getDay())) out.push(ymd(d))
    }
  } else if (rule.mode === "monthly") {
    let y = sy
    let m = sm - 1
    for (let i = 0; i < MAX_OCCURRENCE_MONTHS + 1 && out.length < MAX_OCCURRENCES; i++) {
      let d: Date | null = null
      if (rule.monthlyMode === "bydow") {
        d = nthWeekdayOfMonth(y, m, rule.nthWeekday ?? 0, rule.nth ?? 1)
      } else {
        const day = rule.monthDay ?? sd
        const cand = new Date(y, m, day)
        d = cand.getMonth() === m ? cand : null // 없는 날(2/31 등) skip
      }
      if (d && d >= start && d <= until) out.push(ymd(d))
      m++
      if (m > 11) {
        m = 0
        y++
      }
    }
  }

  return out
}
