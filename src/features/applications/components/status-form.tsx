"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import {
  deleteAdoptionApplication,
  deleteVolunteerApplication,
  updateAdoptionApplication,
  updateVolunteerApplication,
} from "../api/mutations"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Textarea } from "@/shared/components/ui/textarea"
import { useToast } from "@/shared/components/toast"
import {
  isoToLocalKstInput,
  todayKstDate,
} from "@/features/events/lib/date"
import type { ApplicationStatus } from "@/shared/types/database"

const STATUS_OPTIONS: ApplicationStatus[] = [
  "접수",
  "검토중",
  "승인",
  "반려",
]

interface Props {
  id: string
  kind: "adoption" | "volunteer"
  currentStatus: ApplicationStatus
  currentNote: string | null
  applicantName: string
  /** 봉사일 때 캘린더 자동 등록용 — 신청자가 적은 가능 시간대 표시 */
  hint?: {
    availableDays?: string[]
    availableDates?: string[]
    availableTime?: string | null
  }
  /** 이미 등록된 캘린더 이벤트 (재편집용 — 시간 미리 채움) */
  linkedEvent?: { id: string; starts_at: string; ends_at: string } | null
}

export function ApplicationStatusForm({
  id,
  kind,
  currentStatus,
  currentNote,
  applicantName,
  hint,
  linkedEvent,
}: Props) {
  const router = useRouter()
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  const [deleting, startDelete] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<ApplicationStatus>(currentStatus)

  const showSchedule = kind === "volunteer" && status === "승인"

  const VOLUNTEER_DEFAULT_NOTE =
    "안녕하세요! 봉사 신청해주셔서 정말 감사해요 🐾\n야외 견사라 아래 내용 참고해서 편하게 오세요!\n\n• 헌옷 + 헌 신발(장화도 좋아요) + 목장갑 챙겨오시면 좋아요\n• 먼지나 오물이 묻을 수 있으니 아끼는 옷은 피해주세요 😅\n• 현장 물품 지원이 어려울 수 있는 점 양해 부탁드려요 🙏\n\n궁금한 점은 편하게 연락 주세요!\n봉사 담당: 엄재동 팀장 010-3540-3156"

  // 봉사 승인 시 기존 메모가 없으면 기본 안내문 자동 채움
  const defaultNote =
    kind === "volunteer" && !currentNote ? VOLUNTEER_DEFAULT_NOTE : (currentNote ?? "")

  const todayInput = todayKstDate()
  const initialStart = linkedEvent
    ? isoToLocalKstInput(linkedEvent.starts_at)
    : `${todayInput}T10:00`
  const initialEnd = linkedEvent
    ? isoToLocalKstInput(linkedEvent.ends_at)
    : `${todayInput}T12:00`

  const [startsAt, setStartsAt] = useState(initialStart)
  const [endsAt, setEndsAt] = useState(initialEnd)

  function handleStartChange(newStart: string) {
    setStartsAt(newStart)
    if (!newStart) return
    const prevStartMs = new Date(startsAt).getTime()
    const prevEndMs = new Date(endsAt).getTime()
    const gapMs = isNaN(prevStartMs) || isNaN(prevEndMs) ? 2 * 60 * 60 * 1000 : prevEndMs - prevStartMs
    const newStartMs = new Date(newStart).getTime()
    if (!isNaN(newStartMs)) {
      const newEndMs = newStartMs + Math.max(gapMs, 0)
      const pad = (n: number) => String(n).padStart(2, "0")
      const d = new Date(newEndMs)
      const newEnd = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
      setEndsAt(newEnd)
    }
  }

  async function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result =
        kind === "adoption"
          ? await updateAdoptionApplication(id, formData)
          : await updateVolunteerApplication(id, formData)
      if (result.error) {
        setError(result.error)
        toast.error(`저장 실패: ${result.error}`)
      } else {
        toast.success("저장되었습니다")
        router.refresh()
        router.push("/admin/applications")
      }
    })
  }

  return (
    <form
      action={handleSubmit}
      className="space-y-4 rounded-xl border border-border bg-card p-5"
    >
      <div>
        <Label className="mb-2 block text-sm font-semibold">처리 상태</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STATUS_OPTIONS.map((s) => (
            <label
              key={s}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground"
            >
              <input
                type="radio"
                name="status"
                value={s}
                checked={s === status}
                onChange={() => setStatus(s)}
                className="sr-only"
              />
              {s}
            </label>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="admin_note" className="text-sm font-semibold">
          운영진 메모
        </Label>
        <Textarea
          id="admin_note"
          name="admin_note"
          rows={4}
          defaultValue={defaultNote}
          placeholder="상담 진행 내용, 특이사항 등을 기록해 두세요."
          className="mt-2"
        />
      </div>

      {showSchedule && (
        <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
          {/* 수정 대상 이벤트 id (있으면) — 같은 신청에 여러 일정이 있어도 첫 번째 이벤트의 시간을 명확히 수정. */}
          {linkedEvent && (
            <input type="hidden" name="linked_event_id" value={linkedEvent.id} />
          )}
          <div>
            <Label className="text-sm font-semibold text-foreground">
              {linkedEvent ? "캘린더 일정 수정" : "캘린더 자동 등록"}
            </Label>
            <p className="mt-1 text-xs text-muted-foreground">
              {linkedEvent
                ? "이미 캘린더에 등록된 일정입니다. 시간을 바꾸려면 수정 후 저장해주세요."
                : "승인 시 운영진 캘린더에 일정이 자동 등록됩니다. 확정 일시를 입력해주세요."}
            </p>
            {(hint?.availableDates?.length ||
              hint?.availableDays?.length ||
              hint?.availableTime) && (
              <p className="mt-1 text-[11px] text-muted-foreground/80">
                <span className="font-medium text-foreground/80">신청자 요청:</span>{" "}
                {[
                  hint.availableDates?.length
                    ? hint.availableDates.join(", ")
                    : hint.availableDays?.length
                      ? `${hint.availableDays.join(", ")}요일`
                      : null,
                  hint.availableTime,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="scheduled_starts_at" className="text-xs">
                시작 일시
              </Label>
              <Input
                id="scheduled_starts_at"
                name="scheduled_starts_at"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => handleStartChange(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="scheduled_ends_at" className="text-xs">
                종료 일시
              </Label>
              <Input
                id="scheduled_ends_at"
                name="scheduled_ends_at"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground/80">
            비워두면 캘린더 등록은 건너뛰고 상태만 승인됩니다.
          </p>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-2 pt-2">
        {!confirmDelete ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setConfirmDelete(true)}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            신청 삭제
          </Button>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-1.5">
            <span className="text-xs text-destructive">
              {applicantName}님의 신청을 삭제할까요?
            </span>
            <button
              type="button"
              onClick={() => {
                startDelete(async () => {
                  const result =
                    kind === "adoption"
                      ? await deleteAdoptionApplication(id)
                      : await deleteVolunteerApplication(id)
                  if (result?.error) {
                    setError(`삭제 실패: ${result.error}`)
                    setConfirmDelete(false)
                  }
                })
              }}
              disabled={deleting}
              className="text-xs font-semibold text-destructive hover:underline disabled:opacity-50"
            >
              {deleting ? "삭제 중..." : "삭제"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="text-xs text-muted-foreground hover:underline"
            >
              취소
            </button>
          </div>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "저장 중..." : "저장"}
        </Button>
      </div>
    </form>
  )
}
