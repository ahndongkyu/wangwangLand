import {
  getVolunteerTimeOptions,
  VOLUNTEER_APPLICATION_TIME_LABEL,
} from "../lib/volunteer-operating-hours"
import { Label } from "@/shared/components/ui/label"

interface TimeFieldProps {
  selectedDates: string[]
  hour: string
  minute: string
  onHourChange: (hour: string) => void
  onMinuteChange: (minute: string) => void
  error?: string
  required?: boolean
}

export function VolunteerTimeField({
  selectedDates,
  hour,
  minute,
  onHourChange,
  onMinuteChange,
  error,
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
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "available_time-error" : "available_time-hint"}
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
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "available_time-error" : "available_time-hint"}
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
      {selectedDates.length > 0 ? (
        <p id="available_time-hint" className="text-xs leading-relaxed text-muted-foreground">
          신청 가능 시간: {VOLUNTEER_APPLICATION_TIME_LABEL}
          {selectedDates.length > 1 && (
            <span className="mt-0.5 block font-medium text-foreground/80">
              선택한 모든 날짜에 같은 방문 시간이 적용됩니다.
            </span>
          )}
        </p>
      ) : null}
      {error && (
        <p id="available_time-error" className="text-xs font-medium text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
