/**
 * 한국 법정공휴일 (양력 변환·대체공휴일 포함).
 * 매년 새 년도가 다가오면 아래 배열에 추가.
 * 임시공휴일(예: 선거일·국경일 인접 휴일)은 정부 발표 시점에 추가.
 */

interface Holiday {
  date: string // YYYY-MM-DD
  name: string
}

export const KOREAN_HOLIDAYS: Holiday[] = [
  // ───── 2026 ─────
  { date: "2026-01-01", name: "신정" },
  { date: "2026-02-16", name: "설날 연휴" },
  { date: "2026-02-17", name: "설날" },
  { date: "2026-02-18", name: "설날 연휴" },
  { date: "2026-03-01", name: "삼일절" },
  { date: "2026-03-02", name: "대체공휴일" }, // 삼일절(일) 대체
  { date: "2026-05-05", name: "어린이날" },
  { date: "2026-05-24", name: "부처님 오신 날" },
  { date: "2026-05-25", name: "대체공휴일" }, // 부처님오신날(일) 대체
  { date: "2026-06-03", name: "지방선거" },
  { date: "2026-06-06", name: "현충일" },
  { date: "2026-08-15", name: "광복절" },
  { date: "2026-08-17", name: "대체공휴일" }, // 광복절(토) 대체
  { date: "2026-09-24", name: "추석 연휴" },
  { date: "2026-09-25", name: "추석" },
  { date: "2026-09-26", name: "추석 연휴" },
  { date: "2026-10-03", name: "개천절" },
  { date: "2026-10-05", name: "대체공휴일" }, // 개천절(토) 대체
  { date: "2026-10-09", name: "한글날" },
  { date: "2026-12-25", name: "크리스마스" },

  // ───── 2027 ─────
  { date: "2027-01-01", name: "신정" },
  { date: "2027-02-06", name: "설날 연휴" },
  { date: "2027-02-07", name: "설날" },
  { date: "2027-02-08", name: "설날 연휴" },
  { date: "2027-02-09", name: "대체공휴일" }, // 설날(일) 대체
  { date: "2027-03-01", name: "삼일절" },
  { date: "2027-05-05", name: "어린이날" },
  { date: "2027-05-13", name: "부처님 오신 날" },
  { date: "2027-06-06", name: "현충일" },
  { date: "2027-08-15", name: "광복절" },
  { date: "2027-08-16", name: "대체공휴일" }, // 광복절(일) 대체
  { date: "2027-09-14", name: "추석 연휴" },
  { date: "2027-09-15", name: "추석" },
  { date: "2027-09-16", name: "추석 연휴" },
  { date: "2027-10-03", name: "개천절" },
  { date: "2027-10-04", name: "대체공휴일" }, // 개천절(일) 대체
  { date: "2027-10-09", name: "한글날" },
  { date: "2027-10-11", name: "대체공휴일" }, // 한글날(토) 대체
  { date: "2027-12-25", name: "크리스마스" },

  // ───── 2028 ─────
  { date: "2028-01-01", name: "신정" },
  { date: "2028-01-26", name: "설날 연휴" },
  { date: "2028-01-27", name: "설날" },
  { date: "2028-01-28", name: "설날 연휴" },
  { date: "2028-03-01", name: "삼일절" },
  { date: "2028-05-02", name: "부처님 오신 날" },
  { date: "2028-05-05", name: "어린이날" },
  { date: "2028-06-06", name: "현충일" },
  { date: "2028-08-15", name: "광복절" },
  { date: "2028-10-02", name: "추석 연휴" },
  { date: "2028-10-03", name: "개천절·추석" },
  { date: "2028-10-04", name: "추석 연휴" },
  { date: "2028-10-05", name: "대체공휴일" }, // 추석 겹침 대체
  { date: "2028-10-09", name: "한글날" },
  { date: "2028-12-25", name: "크리스마스" },
]

const HOLIDAY_MAP: Map<string, string> = new Map(
  KOREAN_HOLIDAYS.map((h) => [h.date, h.name])
)

/** YYYY-MM-DD → 공휴일 이름 (없으면 null) */
export function getHolidayName(date: string): string | null {
  return HOLIDAY_MAP.get(date) ?? null
}

/** 공휴일 여부 */
export function isHoliday(date: string): boolean {
  return HOLIDAY_MAP.has(date)
}
