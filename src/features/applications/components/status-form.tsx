"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { CalendarDays, ChevronLeft, ChevronRight, Lock, RotateCcw } from "lucide-react"

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
import { cn } from "@/shared/lib/utils"
import { todayKstDate } from "@/features/events/lib/date"
import type { ApplicationStatus } from "@/shared/types/database"

const STATUS_OPTIONS: ApplicationStatus[] = [
  "접수",
  "검토중",
  "승인",
  "반려",
  "취소",
]

interface Props {
  id: string
  kind: "adoption" | "volunteer"
  currentStatus: ApplicationStatus
  currentNote: string | null
  applicantName: string
  /** 봉사 신청에서 내려주는 힌트 (일정 입력 prefill 등) */
  hint?: {
    availableDates?: string[]
    availableTime?: string | null
  }
  /** 등록된 캘린더 일정 수 (뷰모드에서 표시용) */
  linkedEventCount?: number
}

/** 처리 완료 상태 — 기본 뷰모드로 시작 */
const PROCESSED_STATUSES: ApplicationStatus[] = ["승인", "반려", "취소"]

const STATUS_VIEW_LABEL: Record<string, { icon: string; className: string }> = {
  승인: { icon: "✓", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  반려: { icon: "✕", className: "bg-muted text-muted-foreground" },
  취소: { icon: "✕", className: "bg-muted text-muted-foreground/70" },
}

export function ApplicationStatusForm({
  id,
  kind,
  currentStatus,
  currentNote,
  applicantName,
  hint,
  linkedEventCount = 0,
}: Props) {
  const router = useRouter()
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  const [deleting, startDelete] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<ApplicationStatus>(currentStatus)

  // 처리 완료 상태면 기본으로 뷰모드
  const [isViewMode, setIsViewMode] = useState(
    PROCESSED_STATUSES.includes(currentStatus)
  )

  // 일정 등록 스텝은 봉사 + 승인일 때만
  const showSchedule = kind === "volunteer" && status === "승인"

  // 모바일 스텝 상태
  const showCancelReason = status === "취소"
  const totalSteps = showSchedule ? 3 : 2
  const scheduleStep = 3
  const [step, setStep] = useState(1)
  const [cancelReason, setCancelReason] = useState("")

  // 일정 입력 상태 (Step 3) — available_time은 "HH:MM" 형식
  const defaultDate = hint?.availableDates?.[0] ?? todayKstDate()
  const defaultTime = hint?.availableTime ?? "10:00"
  const [startsAt, setStartsAt] = useState(`${defaultDate}T${defaultTime}`)

  const VOLUNTEER_DEFAULT_NOTE =
    "안녕하세요! 봉사 신청해주셔서 정말 감사해요 🐾\n야외 견사라 아래 내용 참고해서 편하게 오세요!\n\n• 헌옷 + 헌 신발(장화도 좋아요) + 목장갑 챙겨오시면 좋아요\n• 먼지나 오물이 묻을 수 있으니 아끼는 옷은 피해주세요 😅\n• 현장 물품 지원이 어려울 수 있는 점 양해 부탁드려요 🙏\n\n궁금한 점은 카카오톡 상담을 통해 편하게 문의주세요^^"

  // 운영진 메모 — controlled state (form 없이 값 수집)
  const [adminNote, setAdminNote] = useState(
    kind === "volunteer" && !currentNote ? VOLUNTEER_DEFAULT_NOTE : (currentNote ?? "")
  )

  // form 없이 state에서 FormData 직접 구성해서 저장
  function handleSave() {
    setError(null)
    const formData = new FormData()
    formData.set("status", status)
    formData.set("admin_note", adminNote)
    if (status === "취소") formData.set("cancel_reason", cancelReason)
    if (showSchedule) formData.set("scheduled_starts_at", startsAt)
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

  // ── 뷰모드 (처리 완료 상태) ───────────────────────────
  if (isViewMode) {
    const viewInfo = STATUS_VIEW_LABEL[currentStatus]
    return (
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-border bg-secondary/20 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold", viewInfo?.className)}>
              {viewInfo?.icon} {currentStatus} 처리 완료
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsViewMode(false)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            <RotateCcw className="size-3" />
            재처리
          </button>
        </div>

        {/* 처리 내용 */}
        <div className="space-y-4 p-5">
          {currentNote ? (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-muted-foreground">운영진 메모</p>
              <p className="whitespace-pre-line rounded-lg bg-secondary/40 px-3 py-2.5 text-sm leading-relaxed text-foreground">
                {currentNote}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">운영진 메모 없음</p>
          )}

          {kind === "volunteer" && linkedEventCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="size-4 text-primary" />
              <span>캘린더 일정 <strong className="text-foreground">{linkedEventCount}개</strong> 등록됨</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 pt-1 text-[11px] text-muted-foreground/60">
            <Lock className="size-3" />
            변경이 필요하면 재처리 버튼을 눌러주세요
          </div>
        </div>
      </div>
    )
  }

  // 스텝 레이블
  const stepLabels = showSchedule
    ? ["상태 선택", "메모 작성", "일정 등록"]
    : ["상태 선택", "메모 작성"]

  // 모바일에서 각 섹션의 가시성
  function sectionVisible(sectionStep: number) {
    return step === sectionStep ? "block" : "hidden sm:block"
  }

  const memoStep = 2

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* ── 모바일 스텝 인디케이터 ─────────────────────────── */}
      <div className="sm:hidden flex items-center justify-between border-b border-border bg-secondary/30 px-4 py-2.5">
        <div className="flex items-center gap-2">
          {stepLabels.map((label, i) => {
            const n = i + 1
            const done = n < step
            const active = n === step
            return (
              <div key={n} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-border">›</span>}
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full text-[10px] font-bold",
                    done && "bg-primary/30 text-primary",
                    active && "bg-primary text-primary-foreground",
                    !done && !active && "bg-secondary text-muted-foreground"
                  )}
                >
                  {done ? "✓" : n}
                </span>
                <span className={cn(
                  "text-[11px] font-medium",
                  active ? "text-foreground" : "text-muted-foreground"
                )}>
                  {label}
                </span>
              </div>
            )
          })}
        </div>
        <span className="text-[10px] text-muted-foreground">
          {step}/{totalSteps}
        </span>
      </div>

      <div className="space-y-4 p-5">
        {/* ── Step 1: 처리 상태 ────────────────────────────── */}
        <div className={sectionVisible(1)}>
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

        {/* ── Step 2: 운영진 메모 ──────────────────── */}
        <div className={sectionVisible(memoStep)}>
          <Label htmlFor="admin_note" className="text-sm font-semibold">
            운영진 메모
          </Label>
          <Textarea
            id="admin_note"
            rows={4}
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            placeholder="상담 진행 내용, 특이사항 등을 기록해 두세요."
            className="mt-2"
          />
        </div>

        {/* 취소 사유 — 상태가 '취소'일 때만 표시 */}
        {showCancelReason && (
          <div>
            <Label htmlFor="cancel_reason" className="text-sm font-semibold text-destructive">
              취소 사유 <span className="text-xs font-normal text-muted-foreground">(필수)</span>
            </Label>
            <Textarea
              id="cancel_reason"
              name="cancel_reason"
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="취소 사유를 입력해주세요. 신청자에게 표시됩니다."
              className="mt-2"
            />
          </div>
        )}

        {/* ── Step 3: 일정 등록 (봉사 승인 시만) ──────────── */}
        {showSchedule && (
          <div className={sectionVisible(scheduleStep)}>
            <div className="mb-3 flex items-center gap-2">
              <CalendarDays className="size-4 text-primary" aria-hidden />
              <Label className="text-sm font-semibold">캘린더 일정 등록</Label>
            </div>
            {hint?.availableDates && hint.availableDates.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                <span className="text-xs text-muted-foreground">신청 날짜:</span>
                {hint.availableDates.map((d) => {
                  const wd = ["일", "월", "화", "수", "목", "금", "토"][new Date(d).getDay()]
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        const time = startsAt.split("T")[1] ?? defaultTime
                        setStartsAt(`${d}T${time}`)
                      }}
                      className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                    >
                      {d.slice(5).replace("-", "/")} ({wd})
                    </button>
                  )
                })}
              </div>
            )}
            <div>
              <Label htmlFor="scheduled_starts_at" className="mb-1.5 block text-xs text-muted-foreground">
                방문 시간
              </Label>
              <Input
                id="scheduled_starts_at"
                name="scheduled_starts_at"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="text-sm"
              />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              입력하지 않으면 일정은 등록되지 않습니다. 이미 등록된 일정이 있으면 중복 등록되지 않아요.
            </p>
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        {/* ── 모바일 스텝 네비게이션 ──────────────────────── */}
        <div className="sm:hidden flex items-center justify-between gap-2 pt-1">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep((s) => s - 1)}
            >
              <ChevronLeft className="size-4" />
              이전
            </Button>
          ) : (
            <span />
          )}

          {step < totalSteps ? (
            <Button
              type="button"
              onClick={() => setStep((s) => s + 1)}
            >
              다음
              <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button type="button" disabled={pending} onClick={handleSave}>
              {pending ? "저장 중..." : "저장"}
            </Button>
          )}
        </div>

        {/* ── 데스크톱 버튼 영역 ──────────────────────────── */}
        <div className="hidden sm:flex items-center justify-between gap-2 pt-2">
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
          <Button type="button" disabled={pending} onClick={handleSave}>
            {pending ? "저장 중..." : "저장"}
          </Button>
        </div>

        {/* ── 모바일 삭제 버튼 (맨 아래) ─────────────────── */}
        <div className="sm:hidden pt-1 border-t border-border">
          {!confirmDelete ? (
            <Button
              type="button"
              variant="outline"
              className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setConfirmDelete(true)}
            >
              신청 삭제
            </Button>
          ) : (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2">
              <span className="text-xs text-destructive">
                {applicantName}님의 신청을 삭제할까요?
              </span>
              <div className="flex gap-3">
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
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
