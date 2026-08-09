import { Sun } from "lucide-react"

import {
  getVolunteerTimeOptions,
  isAugustVolunteerDate,
} from "../lib/volunteer-operating-hours"
import { Label } from "@/shared/components/ui/label"

interface NoticeProps {
  currentPeriodIsAugust?: boolean
  selectedDates: string[]
}

export function AugustVolunteerHoursNotice({
  currentPeriodIsAugust = false,
  selectedDates,
}: NoticeProps) {
  const includesAugustDate = selectedDates.some(isAugustVolunteerDate)
  if (!currentPeriodIsAugust && !includesAugustDate) return null

  return (
    <div className="rounded-xl border-2 border-orange-400 bg-gradient-to-br from-orange-50 to-amber-100 p-4 shadow-sm dark:border-orange-600 dark:from-orange-950/50 dark:to-amber-950/40">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white shadow-sm">
          <Sun className="size-5" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-bold text-orange-950 dark:text-orange-200">
            8월 무더위 봉사 운영시간 안내
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-orange-900 dark:text-orange-200/90">
            한낮의 강한 더위로 인한 안전사고 예방을 위해 8월 한 달간 봉사 운영시간을
            한시적으로 조정합니다.
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-center text-sm font-bold text-orange-950 dark:text-orange-100">
        <div className="rounded-lg border border-orange-300 bg-white/80 px-3 py-2 dark:border-orange-700 dark:bg-orange-950/50">
          오전 07:30~11:00
        </div>
        <div className="rounded-lg border border-orange-300 bg-white/80 px-3 py-2 dark:border-orange-700 dark:bg-orange-950/50">
          오후 15:00~18:30
        </div>
      </div>
      <p className="mt-3 rounded-lg bg-orange-600 px-3 py-2 text-center text-xs font-bold leading-relaxed text-white dark:bg-orange-700">
        12:00~15:00는 식사 시간 및 휴식 시간입니다.
      </p>
      <p className="mt-2 text-center text-[11px] font-semibold leading-relaxed text-orange-900 dark:text-orange-200">
        봉사 방문시간은 08:00~11:00 또는 15:00~17:30 중 선택해 주세요.
      </p>
    </div>
  )
}

interface TimeFieldProps {
  selectedDates: string[]
  hour: string
  minute: string
  onHourChange: (hour: string) => void
  onMinuteChange: (minute: string) => void
  required?: boolean
}

export function VolunteerTimeField({
  selectedDates,
  hour,
  minute,
  onHourChange,
  onMinuteChange,
  required = false,
}: TimeFieldProps) {
  const options = getVolunteerTimeOptions(selectedDates)
  const value = hour && minute ? `${hour}:${minute}` : ""
  const hasInvalidValue = Boolean(value) && !options.includes(value)
  const hourOptions = [...new Set(options.map((time) => time.slice(0, 2)))]
  const minuteOptions = hour
    ? options
        .filter((time) => time.startsWith(`${hour}:`))
        .map((time) => time.slice(3))
    : []
  const includesAugustDate = selectedDates.some(isAugustVolunteerDate)
  const includesRegularDate = selectedDates.some((date) => !isAugustVolunteerDate(date))

  function handleHourChange(nextHour: string) {
    onHourChange(nextHour)
    const nextMinuteOptions = options
      .filter((time) => time.startsWith(`${nextHour}:`))
      .map((time) => time.slice(3))
    if (!nextHour || !nextMinuteOptions.includes(minute)) {
      onMinuteChange("")
    }
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor="available_hour">
        방문 예정 시간
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      <div className="flex items-center gap-2">
        <select
          id="available_hour"
          value={hour}
          onChange={(event) => handleHourChange(event.target.value)}
          disabled={selectedDates.length === 0}
          required={required}
          aria-label="방문 예정 시"
          className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
        >
          <option value="">
            {selectedDates.length === 0 ? "날짜 먼저 선택" : "시 선택"}
          </option>
          {hasInvalidValue && !hourOptions.includes(hour) && (
            <option value={hour} disabled>
              {hour}시 (운영시간 외)
            </option>
          )}
          {hourOptions.map((option) => (
            <option key={option} value={option}>
              {Number(option)}시
            </option>
          ))}
        </select>
        <span className="text-sm font-semibold text-muted-foreground">:</span>
        <select
          id="available_minute"
          value={minute}
          onChange={(event) => onMinuteChange(event.target.value)}
          disabled={!hour || selectedDates.length === 0}
          required={required}
          aria-label="방문 예정 분"
          className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
        >
          <option value="">분 선택</option>
          {hasInvalidValue && !minuteOptions.includes(minute) && (
            <option value={minute} disabled>
              {minute}분 (운영시간 외)
            </option>
          )}
          {minuteOptions.map((option) => (
            <option key={option} value={option}>
              {option}분
            </option>
          ))}
        </select>
      </div>
      <input type="hidden" name="available_time" value={value} />
      {includesAugustDate && includesRegularDate ? (
        <p className="text-[11px] text-muted-foreground">
          8월과 이후 날짜에 모두 방문 가능한 공통 시간만 표시됩니다.
        </p>
      ) : includesAugustDate ? (
        <p className="text-[11px] font-medium text-orange-700 dark:text-orange-400">
          8월 신청 가능 시간: 08:00~11:00 / 15:00~17:30
        </p>
      ) : selectedDates.length > 0 ? (
        <p className="text-[11px] text-muted-foreground">
          기본 신청 가능 시간: 10:00~12:00 / 13:00~17:00
        </p>
      ) : null}
    </div>
  )
}
