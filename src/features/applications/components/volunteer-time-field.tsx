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
          오전 08:00~11:00
        </div>
        <div className="rounded-lg border border-orange-300 bg-white/80 px-3 py-2 dark:border-orange-700 dark:bg-orange-950/50">
          오후 15:00~17:30
        </div>
      </div>
      <p className="mt-3 rounded-lg bg-red-600 px-3 py-2 text-center text-xs font-bold leading-relaxed text-white dark:bg-red-700">
        안전을 위해 오전 운영 종료 후부터 오후 3시 전까지의 방문은 피해 주세요.
      </p>
    </div>
  )
}

interface TimeFieldProps {
  selectedDates: string[]
  value: string
  onChange: (time: string) => void
  required?: boolean
}

export function VolunteerTimeField({
  selectedDates,
  value,
  onChange,
  required = false,
}: TimeFieldProps) {
  const options = getVolunteerTimeOptions(selectedDates)
  const hasInvalidValue = Boolean(value) && !options.includes(value)
  const includesAugustDate = selectedDates.some(isAugustVolunteerDate)
  const includesRegularDate = selectedDates.some((date) => !isAugustVolunteerDate(date))

  return (
    <div className="space-y-1.5">
      <Label htmlFor="available_time">
        방문 예정 시간
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      <select
        id="available_time"
        name="available_time"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={selectedDates.length === 0}
        required={required}
        className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
      >
        <option value="">
          {selectedDates.length === 0 ? "날짜를 먼저 선택해 주세요" : "방문 예정 시간 선택"}
        </option>
        {hasInvalidValue && (
          <option value={value} disabled>
            {value} (현재 운영시간 외)
          </option>
        )}
        {options.map((time) => (
          <option key={time} value={time}>
            {time}
          </option>
        ))}
      </select>
      {includesAugustDate && includesRegularDate ? (
        <p className="text-[11px] text-muted-foreground">
          8월과 이후 날짜에 모두 방문 가능한 공통 시간만 표시됩니다.
        </p>
      ) : includesAugustDate ? (
        <p className="text-[11px] font-medium text-orange-700 dark:text-orange-400">
          8월 운영시간: 08:00~11:00 / 15:00~17:30
        </p>
      ) : selectedDates.length > 0 ? (
        <p className="text-[11px] text-muted-foreground">
          기본 운영시간: 10:00~12:00 / 13:00~17:00
        </p>
      ) : null}
    </div>
  )
}
