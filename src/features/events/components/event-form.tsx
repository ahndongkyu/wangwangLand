"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Lock } from "lucide-react"

import { createEvent, updateEvent } from "../api/mutations"
import { isoToLocalKstInput, todayKstDate } from "../lib/date"
import {
  CATEGORY_LABEL,
  INTERNAL_CATEGORIES,
  type CalendarEvent,
  type EventCategory,
} from "../types"
import { FormFooter } from "@/shared/components/form-footer"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Textarea } from "@/shared/components/ui/textarea"
import { useToast } from "@/shared/components/toast"
import { cn } from "@/shared/lib/utils"

interface Props {
  /** 수정 모드면 기존 이벤트 */
  event?: CalendarEvent
  /** 신규 등록 시 선택된 날짜 (YYYY-MM-DD). 캘린더 셀 클릭에서 채워짐. */
  defaultDate?: string
  /**
   * 봉사 신청에서 가져오기 모드.
   * 등록 시 해당 신청을 자동 승인 + source_application 연결.
   */
  fromApplication?: {
    id: string
    applicantName: string
    partySize: number
    availableDates: string[]
    availableTime: string | null
    activities: string[]
    message: string | null
  }
}

const CATEGORIES: EventCategory[] = [
  "volunteer",
  "event",
  "closed",
  "adoption_consult",
  "custom",
]
const DEFAULT_CUSTOM_COLOR = "#7C7AC9"

/** 기본값: 시작 10:00 (KST). datetime-local 입력 형식. */
function defaultStartFor(date: string): string {
  return `${date}T10:00`
}

function pickContrast(hex: string): string {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return "#FFFFFF"
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.6 ? "#1F1B16" : "#FFFFFF"
}

export function EventForm({ event, defaultDate, fromApplication }: Props) {
  const router = useRouter()
  const toast = useToast()
  const [pending, startTransition] = useTransition()

  // 신청에서 가져온 모드면 카테고리 강제 volunteer.
  const [category, setCategory] = useState<EventCategory>(
    fromApplication ? "volunteer" : (event?.category ?? "volunteer")
  )
  const [allDay, setAllDay] = useState(event?.all_day ?? false)
  const [signupEnabled, setSignupEnabled] = useState(
    event?.signup_enabled ?? (event?.category !== "closed")
  )
  const [customLabel, setCustomLabel] = useState(event?.custom_label ?? "")
  const [customColor, setCustomColor] = useState(
    event?.custom_color ?? DEFAULT_CUSTOM_COLOR
  )

  const isEdit = !!event
  const isInternal = INTERNAL_CATEGORIES.includes(category)
  const showSignupToggle = category === "event" // 봉사=항상 true, 휴무=항상 false

  // 다중 날짜 모드 — 봉사 신청에서 가져왔고 가능 날짜가 1개 이상이면 활성화.
  // 신청자가 여러 날짜를 골랐을 때 운영진이 한 번에 모두 등록할 수 있게 함.
  const isMultiDateMode =
    !!fromApplication && fromApplication.availableDates.length > 0
  const [selectedDates, setSelectedDates] = useState<Set<string>>(
    () => new Set(fromApplication?.availableDates ?? [])
  )

  function toggleDate(d: string) {
    setSelectedDates((prev) => {
      const next = new Set(prev)
      if (next.has(d)) next.delete(d)
      else next.add(d)
      return next
    })
  }

  // 신청에서 가져온 모드의 기본 제목 / 일자
  const defaultTitle = (() => {
    if (event) return event.title
    if (fromApplication) {
      return fromApplication.partySize > 1
        ? `${fromApplication.applicantName} 외 ${fromApplication.partySize - 1}명`
        : fromApplication.applicantName
    }
    return ""
  })()

  const fallbackDate =
    fromApplication?.availableDates[0] ?? defaultDate ?? todayKstDate()
  const defaultDescription = (() => {
    if (event) return event.description ?? ""
    if (fromApplication) {
      return [
        fromApplication.activities.length > 0
          ? `희망 활동: ${fromApplication.activities.join(", ")}`
          : null,
        fromApplication.availableTime
          ? `요청 시간대: ${fromApplication.availableTime}`
          : null,
        fromApplication.message ? `메모: ${fromApplication.message}` : null,
      ]
        .filter(Boolean)
        .join("\n")
    }
    return ""
  })()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = isEdit
        ? await updateEvent(event!.id, formData)
        : await createEvent(formData)
      if (result?.error) toast.error(result.error)
      // 성공 시 server action 이 redirect 처리.
    })
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      {fromApplication && (
        <>
          <input
            type="hidden"
            name="approve_application_id"
            value={fromApplication.id}
          />
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs text-foreground">
            <p className="font-semibold text-primary">
              봉사 신청에서 가져왔어요
            </p>
            <p className="mt-1 text-muted-foreground">
              <span className="font-medium text-foreground">
                {fromApplication.applicantName}
                {fromApplication.partySize > 1 &&
                  ` 외 ${fromApplication.partySize - 1}명`}
              </span>
              {fromApplication.availableDates.length > 0 &&
                ` · 신청 가능 날짜: ${fromApplication.availableDates.join(", ")}`}
              {fromApplication.availableTime &&
                ` · ${fromApplication.availableTime}`}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground/80">
              일정 등록 시 이 신청은 자동으로 <strong>승인</strong> 처리되고
              회원에게 알림이 갑니다.
            </p>
          </div>
        </>
      )}

      {/* 카테고리 + 제목 (한 줄) */}
      <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
        <div className="space-y-1.5">
          <Label htmlFor="category">카테고리</Label>
          <select
            id="category"
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as EventCategory)}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c === "custom" ? "직접 입력" : CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="title">
            제목 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            name="title"
            required
            maxLength={100}
            defaultValue={defaultTitle}
            placeholder="예: 보리·뽀삐 산책 봉사"
          />
        </div>
      </div>

      {isInternal && (
        <p className="-mt-2 flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-300">
          <Lock className="size-3.5 shrink-0" aria-hidden />
          이 카테고리는 관리자·운영진에게만 보이며, 사용자 캘린더에는 표시되지 않습니다.
        </p>
      )}

      {/* 직접 입력 카테고리 — 이름 + 색상 */}
      {category === "custom" && (
        <div className="space-y-3 rounded-md border border-border bg-secondary/30 p-3">
          <div className="space-y-1.5">
            <Label htmlFor="custom_label" className="text-xs font-semibold">
              카테고리 이름 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="custom_label"
              name="custom_label"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              maxLength={20}
              placeholder="예: 정기 회의, 교육"
              required
            />
          </div>
          <div className="flex items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="custom_color" className="text-xs font-semibold">
                색상
              </Label>
              <input
                id="custom_color"
                name="custom_color"
                type="color"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                className="h-9 w-16 cursor-pointer rounded-md border border-border bg-card p-0.5"
              />
            </div>
            <div className="flex-1">
              <p className="mb-1 text-[11px] text-muted-foreground">미리보기</p>
              <span
                className="inline-block rounded-sm px-2 py-1 text-[11px] font-medium"
                style={{
                  backgroundColor: customColor,
                  color: pickContrast(customColor),
                }}
              >
                {customLabel || "카테고리 이름"}
              </span>
            </div>
          </div>
        </div>
      )}

      {isMultiDateMode ? (
        <>
          {/* 다중 날짜 선택 */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              등록할 날짜 <span className="text-destructive">*</span>
            </Label>
            <p className="text-[11px] text-muted-foreground">
              신청자가 가능하다고 선택한 날짜들. 체크된 날짜마다 일정이 한 개씩 등록됩니다.
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {fromApplication!.availableDates.map((d) => {
                const checked = selectedDates.has(d)
                return (
                  <label
                    key={d}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                      checked
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleDate(d)}
                      className="size-3.5 accent-primary"
                    />
                    {d}
                  </label>
                )
              })}
            </div>
            {Array.from(selectedDates).map((d) => (
              <input key={d} type="hidden" name="selected_dates" value={d} />
            ))}
          </div>

          {/* 시작 시간 (HH:MM only — 모든 선택 날짜에 동일 적용) */}
          <div className="space-y-1.5">
            <Label htmlFor="start_time">
              시작 시간 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="start_time"
              name="start_time"
              type="time"
              defaultValue="10:00"
              required
              className="sm:max-w-[200px]"
            />
          </div>
          <p className="text-[11px] text-muted-foreground/80">
            선택한 모든 날짜에 동일 시간으로 등록됩니다.
          </p>
        </>
      ) : (
        /* 일시 (단일 날짜 + 시작 시간) */
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="starts_at">
              일시 <span className="text-destructive">*</span>
            </Label>
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
              <input
                id="all_day"
                name="all_day"
                type="checkbox"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                className="size-3.5 accent-primary"
              />
              종일
            </label>
          </div>
          <Input
            id="starts_at"
            name="starts_at"
            type={allDay ? "date" : "datetime-local"}
            required
            defaultValue={
              event
                ? isoToLocalKstInput(event.starts_at, allDay)
                : allDay
                  ? fallbackDate
                  : defaultStartFor(fallbackDate)
            }
            className="sm:max-w-[280px]"
          />
        </div>
      )}

      {/* 메모 */}
      <div className="space-y-1.5">
        <Label htmlFor="description">메모</Label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={defaultDescription}
          placeholder="활동 내용·준비물·주의사항 등을 적어주세요."
        />
      </div>

      {/* 신청 토글 (행사일 때만) */}
      {showSignupToggle && (
        <div className="rounded-md border border-border bg-secondary/40 p-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="signup_enabled"
              checked={signupEnabled}
              onChange={(e) => setSignupEnabled(e.target.checked)}
              className="size-4 accent-primary"
            />
            <span className="font-medium text-foreground">회원 신청 받기</span>
            <span className="text-xs text-muted-foreground">
              (회원이 캘린더에서 직접 신청할 수 있게 합니다)
            </span>
          </label>
        </div>
      )}
      {category === "volunteer" && (
        <input type="hidden" name="signup_enabled" value="on" />
      )}

      <FormFooter
        pending={pending}
        submitLabel={isEdit ? "수정 저장" : "일정 등록"}
        pendingLabel={isEdit ? "저장 중..." : "등록 중..."}
        onCancel={() => router.back()}
      />
    </form>
  )
}
