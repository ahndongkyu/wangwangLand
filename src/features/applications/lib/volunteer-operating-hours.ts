const KST_OFFSET_MS = 9 * 60 * 60 * 1000
const TIME_STEP_MINUTES = 10

export const AUGUST_VOLUNTEER_PERIOD = {
  start: "2026-08-01",
  end: "2026-08-31",
} as const

interface TimeWindow {
  start: string
  end: string
}

const AUGUST_TIME_WINDOWS: TimeWindow[] = [
  { start: "08:00", end: "11:00" },
  { start: "15:00", end: "17:30" },
]

const REGULAR_TIME_WINDOWS: TimeWindow[] = [
  { start: "10:00", end: "11:50" },
  { start: "13:00", end: "17:00" },
]

function timeToMinutes(time: string): number {
  const [hour, minute] = time.split(":").map(Number)
  return hour * 60 + minute
}

function minutesToTime(minutes: number): string {
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}

function buildTimeOptions(windows: TimeWindow[]): string[] {
  return windows.flatMap(({ start, end }) => {
    const options: string[] = []
    for (
      let minutes = timeToMinutes(start);
      minutes <= timeToMinutes(end);
      minutes += TIME_STEP_MINUTES
    ) {
      options.push(minutesToTime(minutes))
    }
    return options
  })
}

const AUGUST_TIME_OPTIONS = buildTimeOptions(AUGUST_TIME_WINDOWS)
const REGULAR_TIME_OPTIONS = buildTimeOptions(REGULAR_TIME_WINDOWS)

export function isValidVolunteerDate(date: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) return false

  const [, year, month, day] = match
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  return (
    parsed.getUTCFullYear() === Number(year) &&
    parsed.getUTCMonth() === Number(month) - 1 &&
    parsed.getUTCDate() === Number(day)
  )
}

export function isAugustVolunteerDate(date: string): boolean {
  return date >= AUGUST_VOLUNTEER_PERIOD.start && date <= AUGUST_VOLUNTEER_PERIOD.end
}

export function getKstDateKey(now = new Date()): string {
  const kst = new Date(now.getTime() + KST_OFFSET_MS)
  return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, "0")}-${String(kst.getUTCDate()).padStart(2, "0")}`
}

export function isAugustVolunteerPeriodActive(now = new Date()): boolean {
  return isAugustVolunteerDate(getKstDateKey(now))
}

function getTimeOptionsForDate(date: string): string[] {
  return isAugustVolunteerDate(date) ? AUGUST_TIME_OPTIONS : REGULAR_TIME_OPTIONS
}

/** 선택된 모든 날짜에 공통으로 가능한 방문 시간을 반환합니다. */
export function getVolunteerTimeOptions(dates: string[]): string[] {
  const uniqueDates = [...new Set(dates)]
  if (uniqueDates.length === 0 || uniqueDates.some((date) => !isValidVolunteerDate(date))) {
    return []
  }

  const [firstDate, ...restDates] = uniqueDates
  return getTimeOptionsForDate(firstDate).filter((time) =>
    restDates.every((date) => getTimeOptionsForDate(date).includes(time))
  )
}

export function validateVolunteerSchedule(dates: string[], time: string): string | null {
  if (dates.length === 0 || dates.some((date) => !isValidVolunteerDate(date))) {
    return "봉사 가능 날짜를 하나 이상 선택해주세요."
  }
  if (!time) return "방문 예정 시간을 선택해주세요."
  if (!getVolunteerTimeOptions(dates).includes(time)) {
    return "선택한 날짜의 운영시간 안에서 방문 예정 시간을 선택해주세요."
  }
  return null
}
