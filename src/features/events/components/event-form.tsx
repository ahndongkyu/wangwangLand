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
}

const CATEGORIES: EventCategory[] = ["volunteer", "event", "closed"]

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

export function EventForm({ event }: Props) {
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
        <div className="grid grid-cols-3 gap-2">
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
              {CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
      </div>

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
              event ? toLocalInput(event.starts_at, allDay) : undefined
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
              event ? toLocalInput(event.ends_at, allDay) : undefined
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
