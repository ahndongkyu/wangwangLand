"use client"

import { useRouter } from "next/navigation"
import { useRef, useState, useTransition } from "react"
import { CalendarDays, ChevronLeft, ChevronRight, Lock, Plus, RotateCcw, X } from "lucide-react"

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
  /** 일정변경요청 상태일 때 신청자가 요청한 날짜/시간 */
  rescheduleInfo?: { dates: string[]; time: string | null }
}

/** 처리 완료 상태 — 기본 뷰모드로 시작 */
const PROCESSED_STATUSES: ApplicationStatus[] = ["승인", "반려", "취소", "일정변경요청"]

const STATUS_VIEW_LABEL: Record<string, { icon: string; className: string }> = {
  승인: { icon: "✓", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  반려: { icon: "✕", className: "bg-muted text-muted-foreground" },
  취소: { icon: "✕", className: "bg-muted text-muted-foreground/70" },
  일정변경요청: { icon: "🗓️", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
}

export function ApplicationStatusForm({
  id,
  kind,
  currentStatus,
  currentNote,
  applicantName,
  hint,
  linkedEventCount = 0,
  rescheduleInfo,
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

  const VOLUNTEER_DEFAULT_NOTE =
    "안녕하세요! 봉사 신청해주셔서 정말 감사해요 🐾\n야외 견사라 아래 내용 참고해서 편하게 오세요!\n\n• 헌옷 + 헌 신발(장화도 좋아요) + 목장갑 챙겨오시면 좋아요\n• 먼지나 오물이 묻을 수 있으니 아끼는 옷은 피해주세요 😅\n• 현장 물품 지원이 어려울 수 있는 점 양해 부탁드려요 🙏\n\n궁금한 점은 카카오톡 상담을 통해 편하게 문의주세요^^"

  // 승인 안내문은 승인 상태에서만 자동 입력한다.
  const initialAdminNote =
    currentNote ?? (kind === "volunteer" && currentStatus === "승인" ? VOLUNTEER_DEFAULT_NOTE : "")
  const [adminNote, setAdminNote] = useState(initialAdminNote)
  const noteDrafts = useRef<Partial<Record<ApplicationStatus, string>>>({
    [currentStatus]: initialAdminNote,
  })
  const [approvalMode, setApprovalMode] = useState<"with_schedule" | "approval_only">(
    linkedEventCount > 0 ? "approval_only" : "with_schedule"
  )
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set())
  const [scheduleTime, setScheduleTime] = useState(hint?.availableTime ?? "10:00")
  const [customDate, setCustomDate] = useState(todayKstDate())

  function handleStatusChange(nextStatus: ApplicationStatus) {
    setStatus(nextStatus)
    setError(null)
    if (kind !== "volunteer") return

    // 상태별 메모를 따로 보관해 승인 안내문과 반려 사유가 섞이지 않게 한다.
    noteDrafts.current[status] = adminNote
    const nextDraft = noteDrafts.current[nextStatus]
    setAdminNote(nextDraft ?? (nextStatus === "승인" ? VOLUNTEER_DEFAULT_NOTE : ""))
  }

  function toggleScheduleDate(date: string) {
    setSelectedDates((prev) => {
      const next = new Set(prev)
      if (next.has(date)) next.delete(date)
      else next.add(date)
      return next
    })
  }

  function appendScheduleFields(formData: FormData) {
    formData.set("schedule_mode", approvalMode)
    if (approvalMode !== "with_schedule") return
    for (const date of selectedDates) formData.append("selected_dates", date)
    formData.set("schedule_time", scheduleTime)
  }

  // form 없이 state에서 FormData 직접 구성해서 저장
  function handleSave() {
    setError(null)
    if (status === "승인" && approvalMode === "with_schedule" && selectedDates.size === 0) {
      setError("확정할 날짜를 1개 이상 선택해주세요.")
      return
    }
    if (status === "반려" && !adminNote.trim()) {
      setError("반려 사유를 입력해주세요.")
      return
    }
    const formData = new FormData()
    formData.set("status", status)
    formData.set("admin_note", adminNote)
    if (status === "취소") formData.set("cancel_reason", cancelReason)
    if (showSchedule) appendScheduleFields(formData)
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
    const isRescheduleRequest = currentStatus === "일정변경요청"
    const headerLabel = isRescheduleRequest ? "일정변경 요청 중" : `${currentStatus} 처리 완료`
    return (
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-border bg-secondary/20 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold", viewInfo?.className)}>
              {viewInfo?.icon} {headerLabel}
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
          {isRescheduleRequest && rescheduleInfo && rescheduleInfo.dates.length > 0 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 dark:border-blue-800/40 dark:bg-blue-950/20">
              <p className="mb-1.5 text-xs font-semibold text-blue-800 dark:text-blue-300">
                확정할 날짜를 선택해주세요
              </p>
              <div className="flex flex-wrap gap-1.5">
                {rescheduleInfo.dates.map((date) => {
                  const wd = ["일", "월", "화", "수", "목", "금", "토"][new Date(date).getDay()]
                  const checked = selectedDates.has(date)
                  return (
                    <button
                      key={date}
                      type="button"
                      aria-pressed={checked}
                      onClick={() => toggleScheduleDate(date)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                        checked
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-blue-200 bg-white text-blue-700 dark:border-blue-800 dark:bg-blue-950/20 dark:text-blue-300"
                      )}
                    >
                      {date.slice(5).replace("-", "/")} ({wd})
                    </button>
                  )
                })}
              </div>
              <div className="mt-2 max-w-40">
                <Label htmlFor="reschedule_time" className="text-[11px] text-muted-foreground">
                  확정 시간
                </Label>
                <Input
                  id="reschedule_time"
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="mt-1 h-8 text-xs"
                />
              </div>
              {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
              {/* 승인 / 거절 빠른 버튼 */}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (selectedDates.size === 0) {
                      setError("확정할 날짜를 1개 이상 선택해주세요.")
                      return
                    }
                    const formData = new FormData()
                    formData.set("status", "승인")
                    formData.set("admin_note", adminNote)
                    formData.set("schedule_mode", "with_schedule")
                    for (const date of selectedDates) formData.append("selected_dates", date)
                    formData.set("schedule_time", scheduleTime)
                    startTransition(async () => {
                      const result = await updateVolunteerApplication(id, formData)
                      if (result.error) { toast.error(`실패: ${result.error}`) }
                      else { toast.success("일정변경 승인됐습니다"); router.refresh(); router.push("/admin/applications") }
                    })
                  }}
                  className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {pending ? "처리 중..." : "일정변경 승인"}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    const formData = new FormData()
                    formData.set("status", "승인")
                    formData.set("admin_note", adminNote)
                    formData.set("reject_reschedule", "true")
                    startTransition(async () => {
                      const result = await updateVolunteerApplication(id, formData)
                      if (result.error) { toast.error(`실패: ${result.error}`) }
                      else { toast.success("일정변경 거절됐습니다"); router.refresh(); router.push("/admin/applications") }
                    })
                  }}
                  className="rounded-lg border border-border bg-background px-4 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary disabled:opacity-50"
                >
                  거절
                </button>
              </div>
            </div>
          )}

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

          {!isRescheduleRequest && (
            <div className="flex items-center gap-1.5 pt-1 text-[11px] text-muted-foreground/60">
              <Lock className="size-3" />
              변경이 필요하면 재처리 버튼을 눌러주세요
            </div>
          )}
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
                  onChange={() => handleStatusChange(s)}
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
            {status === "반려" ? "반려 사유" : "운영진 메모"}
            {status === "반려" && <span className="ml-1 text-destructive">*</span>}
          </Label>
          <Textarea
            id="admin_note"
            rows={4}
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            placeholder={
              status === "반려"
                ? "신청자에게 안내할 반려 사유를 입력해주세요."
                : "상담 진행 내용, 특이사항 등을 기록해 두세요."
            }
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
              <Label className="text-sm font-semibold">승인 방식</Label>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className={cn(
                "cursor-pointer rounded-lg border p-3 text-sm transition-colors",
                approvalMode === "with_schedule"
                  ? "border-primary bg-primary/5"
                  : "border-border bg-background"
              )}>
                <input
                  type="radio"
                  className="mr-2 accent-primary"
                  checked={approvalMode === "with_schedule"}
                  onChange={() => setApprovalMode("with_schedule")}
                />
                <span className="font-semibold">승인 + 일정 확정</span>
                <span className="mt-1 block pl-5 text-[11px] text-muted-foreground">
                  선택한 날짜를 캘린더에 함께 등록합니다.
                </span>
              </label>
              <label className={cn(
                "cursor-pointer rounded-lg border p-3 text-sm transition-colors",
                approvalMode === "approval_only"
                  ? "border-primary bg-primary/5"
                  : "border-border bg-background"
              )}>
                <input
                  type="radio"
                  className="mr-2 accent-primary"
                  checked={approvalMode === "approval_only"}
                  onChange={() => setApprovalMode("approval_only")}
                />
                <span className="font-semibold">승인만</span>
                <span className="mt-1 block pl-5 text-[11px] text-muted-foreground">
                  일정은 나중에 별도로 등록합니다.
                </span>
              </label>
            </div>

            {approvalMode === "with_schedule" && (
              <div className="mt-4 space-y-4 rounded-lg border border-border bg-secondary/20 p-3">
                <div>
                  <p className="text-xs font-semibold text-foreground">확정할 날짜</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    신청자가 선택한 날짜는 후보입니다. 실제 방문 날짜만 선택해주세요.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(hint?.availableDates ?? []).map((date) => {
                      const checked = selectedDates.has(date)
                      return (
                        <button
                          key={date}
                          type="button"
                          aria-pressed={checked}
                          onClick={() => toggleScheduleDate(date)}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                            checked
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-foreground hover:border-primary/50"
                          )}
                        >
                          {checked ? "✓ " : ""}{date}
                        </button>
                      )
                    })}
                    {(hint?.availableDates ?? []).length === 0 && (
                      <span className="text-xs text-muted-foreground">신청자가 선택한 날짜가 없습니다.</span>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="custom_schedule_date" className="text-xs">다른 날짜 추가</Label>
                  <div className="mt-1 flex gap-2">
                    <Input
                      id="custom_schedule_date"
                      type="date"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      className="max-w-48 text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (!customDate) return
                        setSelectedDates((prev) => new Set(prev).add(customDate))
                      }}
                    >
                      <Plus className="size-3.5" /> 추가
                    </Button>
                  </div>
                </div>

                {selectedDates.size > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {[...selectedDates].sort().map((date) => (
                      <span key={date} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                        {date}
                        <button
                          type="button"
                          aria-label={`${date} 제거`}
                          onClick={() => toggleScheduleDate(date)}
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="max-w-48">
                  <Label htmlFor="schedule_time" className="text-xs">방문 시간</Label>
                  <Input
                    id="schedule_time"
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="mt-1 text-sm"
                  />
                </div>
              </div>
            )}

          </div>
        )}

        {kind === "volunteer" && status !== "승인" && linkedEventCount > 0 && (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
            승인 외 상태로 저장하면 등록된 캘린더 일정 {linkedEventCount}개가 함께 삭제됩니다.
          </p>
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
