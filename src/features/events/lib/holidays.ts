/**
 * 한국 법정공휴일 — @hyunbinseo/holidays-kr 라이브러리 사용.
 * 라이브러리에 없는 연도(2027~)는 새 버전이 배포되면 import 추가.
 */

import {
  y2018,
  y2019,
  y2020,
  y2021,
  y2022,
  y2023,
  y2024,
  y2025,
  y2026,
} from "@hyunbinseo/holidays-kr"

type YearMap = Record<string, readonly string[]>

const ALL_YEARS: YearMap[] = [
  y2018, y2019, y2020, y2021, y2022, y2023, y2024, y2025, y2026,
]

const HOLIDAY_MAP = new Map<string, string>(
  ALL_YEARS.flatMap((y) =>
    Object.entries(y).map(([date, names]) => [date, names.join(" · ")] as const)
  )
)

/** YYYY-MM-DD → 공휴일 이름 (없으면 null) */
export function getHolidayName(date: string): string | null {
  return HOLIDAY_MAP.get(date) ?? null
}

/** 공휴일 여부 */
export function isHoliday(date: string): boolean {
  return HOLIDAY_MAP.has(date)
}
