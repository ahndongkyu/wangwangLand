"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { createEvent, updateEvent } from "../api/mutations"
import { CATEGORY_LABEL, type CalendarEvent, type EventCategory } from "../types"
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
}

const CATEGORIES: EventCategory[] = ["volunteer", "event", "closed", "custom"]
const DEFAULT_CUSTOM_COLOR = "#7C7AC9"

/** Date(UTC) → datetime-local 입력값 (KST) */
function toLocalInput(iso: string, allDay: boolean): string {
  const d = new Date(iso)
  // KST 컴포넌트
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000)
  const yyyy = kst.getUTCFullYear()
  const mm = String(kst.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(kst.getUTCDate()).padStart(2, "0")
  if (allDay) return `${yyyy}-${mm}-${dd}`
  const hh = String(kst.getUTCHours()).padStart(2, "0")
  const mi = String(kst.getUTCMinutes()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
}

/** 기본값: 시작 10:00, 종료 12:00 (KST). datetime-local 입력 형식. */
function defaultStartFor(date: string): string {
  return `${date}T10:00`
}
function defaultEndFor(date: string): string {
  return `${date}T12:00`
}

function pickContrast(hex: string): string {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return "#FFFFFF"
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.6 ? "#1F1B16" : "#FFFFFF"
}

/** 오늘 KST 의 YYYY-MM-DD */
function todayKstDate(): string {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, "0")}-${String(kst.getUTCDate()).padStart(2, "0")}`
}

export function EventForm({ event, defaultDate }: Props) {
  const router = useRouter()
  const toast = useToast()
  const [pending, startTransition] = useTransition()

  const [category, setCategory] = useState<EventCategory>(
    event?.category ?? "volunteer"
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
  const showSignupToggle = category === "event" // 봉사=항상 true, 휴무=항상 false

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
      {/* 카테고리 */}
      <div>
        <Label className="mb-2 block text-sm font-semibold">카테고리</Label>
        <input type="hidden" name="category" value={category} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cn(
                "rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                category === c
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              {c === "custom" ? "직접 입력" : CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
      </div>

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

      {/* 제목 */}
      <div className="space-y-1.5">
        <Label htmlFor="title">
          제목 <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          name="title"
          required
          maxLength={100}
          defaultValue={event?.title ?? ""}
          placeholder="예: 보리·뽀삐 산책 봉사"
        />
      </div>

      {/* 종일 토글 */}
      <div className="flex items-center gap-2">
        <input
          id="all_day"
          name="all_day"
          type="checkbox"
          checked={allDay}
          onChange={(e) => setAllDay(e.target.checked)}
          className="size-4 accent-primary"
        />
        <Label htmlFor="all_day" className="cursor-pointer text-sm">
          종일 일정
        </Label>
      </div>

      {/* 시작·종료 */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="starts_at">
            시작 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="starts_at"
            name="starts_at"
            type={allDay ? "date" : "datetime-local"}
            required
            defaultValue={
              event
                ? toLocalInput(event.starts_at, allDay)
                : allDay
                  ? defaultDate ?? todayKstDate()
                  : defaultDate
                    ? defaultStartFor(defaultDate)
                    : defaultStartFor(todayKstDate())
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ends_at">
            종료 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="ends_at"
            name="ends_at"
            type={allDay ? "date" : "datetime-local"}
            required
            defaultValue={
              event
                ? toLocalInput(event.ends_at, allDay)
                : allDay
                  ? defaultDate ?? todayKstDate()
                  : defaultDate
                    ? defaultEndFor(defaultDate)
                    : defaultEndFor(todayKstDate())
            }
          />
        </div>
      </div>

      {/* 장소 */}
      <div className="space-y-1.5">
        <Label htmlFor="location">장소</Label>
        <Input
          id="location"
          name="location"
          maxLength={100}
          defaultValue={event?.location ?? ""}
          placeholder="예: 왕왕랜드 본관"
        />
      </div>

      {/* 설명 */}
      <div className="space-y-1.5">
        <Label htmlFor="description">상세 안내</Label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={event?.description ?? ""}
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
