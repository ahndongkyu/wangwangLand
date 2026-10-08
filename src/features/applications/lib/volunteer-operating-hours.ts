const TIME_STEP_MINUTES = 10

export const VOLUNTEER_APPLICATION_TIME_LABEL = "10:00~11:00 / 13:00~17:00"

interface TimeWindow {
  start: string
  end: string
}

const REGULAR_TIME_WINDOWS: TimeWindow[] = [
  { start: "10:00", end: "11:00" },
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

/** 유효한 날짜를 선택했을 때 가능한 방문 시간을 반환합니다. */
export function getVolunteerTimeOptions(dates: string[], now = new Date()): string[] {
  const uniqueDates = [...new Set(dates)]
  if (uniqueDates.length === 0 || uniqueDates.some((date) => !isValidVolunteerDate(date))) {
    return []
  }
  return REGULAR_TIME_OPTIONS.filter((time) =>
    uniqueDates.every((date) => new Date(`${date}T${time}:00+09:00`).getTime() > now.getTime())
  )
}

export function volunteerToday(now = new Date()): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

export function validateVolunteerSchedule(dates: string[], time: string, now = new Date()): string | null {
  if (dates.length === 0 || dates.some((date) => !isValidVolunteerDate(date))) {
    return "봉사 가능 날짜를 하나 이상 선택해주세요."
  }
  if (!time) return "방문 예정 시간을 선택해주세요."
  if (dates.some((date) => date < volunteerToday(now))) {
    return "지난 날짜에는 봉사를 신청할 수 없습니다."
  }
  if (!REGULAR_TIME_OPTIONS.includes(time)) {
    return "선택한 날짜의 운영시간 안에서 방문 예정 시간을 선택해주세요."
  }
  if (dates.some((date) => new Date(`${date}T${time}:00+09:00`).getTime() <= now.getTime())) {
    return "이미 지난 시간에는 봉사를 신청할 수 없습니다. 방문 시간을 다시 선택해주세요."
  }
  return null
}
