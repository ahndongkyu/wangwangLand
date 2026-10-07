"use client"

import Link from "next/link"
import { useRef, useState, useTransition } from "react"
import { deleteAdoptionApplication, deleteVolunteerApplication, updateAdoptionApplication, updateVolunteerApplication } from "../api/mutations"
import { Button } from "@/shared/components/ui/button"
import { Textarea } from "@/shared/components/ui/textarea"
import { useSaveFeedback } from "@/shared/lib/use-save-feedback"
import type { ApplicationStatus } from "@/shared/types/database"
import { applicationDate, validDate } from "../lib/admin-list"
import { approveVolunteerAndContinue } from "../api/processing"
import { applicationBackLabel } from "../lib/detail-navigation"

const VOLUNTEER_DEFAULT_NOTE = "안녕하세요! 왕왕랜드 봉사에 함께해주셔서 진심으로 감사드립니다 🐾\n\n야외 견사에서 진행되는 활동이라, 편하게 움직일 수 있는 복장으로 와주시면 좋아요.\n\n• 오염되어도 괜찮은 헌옷과 편한 신발을 추천드려요. 장화도 좋아요!\n• 목장갑이 있다면 함께 챙겨와 주세요.\n• 먼지나 오물이 묻을 수 있어 아끼는 옷은 피해주시면 좋습니다.\n• 현장 물품 지원이 어려울 수 있는 점 너른 양해 부탁드립니다.\n\n그리고 가능하시다면 보호소 청소에 사용할 100L 쓰레기봉투 한 장을 후원해주셔도 큰 도움이 됩니다.\n\n물론 필수는 아니며, 부담 없이 마음이 닿으실 때만 함께해 주세요 🙏\n\n궁금한 점은 카카오톡 상담으로 편하게 문의해 주세요. 감사합니다^^"
const STATUS_OPTIONS: ApplicationStatus[] = ["접수", "검토중", "승인", "반려", "취소"]

interface Props {
  id: string
  kind: "adoption" | "volunteer"
  currentStatus: ApplicationStatus
  currentNote: string | null
  applicantName: string
  hint?: { availableDates?: string[]; availableTime?: string | null }
  linkedEventCount?: number
  linkedEvents?: Array<{ starts_at: string }>
  rescheduleInfo?: { dates: string[]; time: string | null }
  approvalInfo?: { nickname: string; role: string; approvedAt: string } | null
  returnHref?: string
  currentCancelReason?: string | null
  partySize?: number
}

export function ApplicationStatusForm({
  id, kind, currentStatus, currentNote, applicantName, hint, linkedEventCount = 0,
  linkedEvents = [], rescheduleInfo, approvalInfo, returnHref = "/admin/applications",
  currentCancelReason, partySize,
}: Props) {
  const reschedule = kind === "volunteer" && currentStatus === "일정변경요청"
  const [editing, setEditing] = useState(reschedule || !["승인", "반려", "취소"].includes(currentStatus))
  const freshVolunteer = kind === "volunteer" && ["접수", "검토중"].includes(currentStatus)
  const [status, setStatus] = useState<ApplicationStatus>(reschedule || freshVolunteer ? "승인" : currentStatus)
  const [advanced, setAdvanced] = useState(false)
  const [decision, setDecision] = useState<"accept" | "reject">("accept")
  const [approvalMode, setApprovalMode] = useState<"with_schedule" | "approval_only">(linkedEventCount ? "approval_only" : "with_schedule")
  const [adminNote, setAdminNote] = useState(currentNote ?? (kind === "volunteer" && (freshVolunteer || currentStatus === "승인" || reschedule) ? VOLUNTEER_DEFAULT_NOTE : ""))
  const drafts = useRef<Partial<Record<ApplicationStatus, string>>>({})
  const [cancelReason, setCancelReason] = useState(currentCancelReason ?? "")
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { save, pending, completed } = useSaveFeedback(setError)
  const [deleting, startDelete] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const busy = pending || completed || deleting
  const dates = [...new Set(reschedule ? rescheduleInfo?.dates ?? [] : hint?.availableDates ?? [])].sort()
  const time = reschedule ? rescheduleInfo?.time : hint?.availableTime
  const addsSchedule = kind === "volunteer" && status === "승인" && (reschedule ? decision === "accept" : approvalMode === "with_schedule")
  const removesSchedule = kind === "volunteer" && status !== "승인" && linkedEventCount > 0
  const quickApproval = freshVolunteer && !reschedule && status === "승인" && approvalMode === "with_schedule" && !linkedEventCount && !advanced
  const needsConfirmation = (addsSchedule && !quickApproval) || removesSchedule
  const validSchedule = dates.length > 0 && dates.every(validDate) && !!time && /^([01]\d|2[0-3]):[0-5]\d$/.test(time)
  const newDates = dates.filter(date => !linkedEvents.some(event => Date.parse(event.starts_at) === Date.parse(date + "T" + time + ":00+09:00")))
  function changeStatus(next: ApplicationStatus) {
    drafts.current[status] = adminNote
    setStatus(next)
    setAdminNote(drafts.current[next] ?? (kind === "volunteer" && next === "승인" ? VOLUNTEER_DEFAULT_NOTE : ""))
    setConfirmed(false); setError(null)
  }
  async function handleSave(continueNext = false) {
    if (busy) return
    if (addsSchedule && !validSchedule) { setError("날짜 또는 시간을 확인해 주세요. 일정 정보가 없으면 자동 등록할 수 없습니다."); return }
    if (needsConfirmation && !confirmed) { setError("변경될 캘린더 일정을 확인해 주세요."); return }
    if (status === "반려" && !adminNote.trim()) { setError("반려 사유를 입력해 주세요."); return }
    if (status === "취소" && !cancelReason.trim()) { setError("취소 사유를 입력해 주세요."); return }
    const formData = new FormData()
    formData.set("status", status)
    formData.set("admin_note", adminNote)
    formData.set("cancel_reason", cancelReason)
    formData.set("schedule_mode", reschedule ? "with_schedule" : approvalMode)
    if (reschedule && decision === "reject") formData.set("reject_reschedule", "true")
    await save(() => continueNext && quickApproval ? approveVolunteerAndContinue(id, formData, returnHref) : kind === "volunteer" ? updateVolunteerApplication(id, formData) : updateAdoptionApplication(id, formData),
      reschedule ? (decision === "accept" ? "변경 일정으로 승인했습니다." : "기존 일정을 유지했습니다.") : addsSchedule ? "승인 완료 · 캘린더에 일정이 등록되었습니다." : "신청 처리 내용이 저장되었습니다.", continueNext && quickApproval ? undefined : returnHref)
  }
  const actionLabel = reschedule ? (decision === "accept" ? "승인 및 일정 교체" : "변경 거절 · 기존 일정 유지") : addsSchedule ? "승인 및 일정 등록" : "저장"
  return <section className="w-full min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5">
    <div className="mb-5 flex items-center justify-between gap-3">
      <h2 className="text-lg font-semibold">신청 처리</h2>
      {!editing && <Button type="button" variant="outline" onClick={() => setEditing(true)}>처리 수정</Button>}
    </div>
    {approvalInfo && <p className="mb-4 text-xs leading-6 text-muted-foreground break-all">승인 담당: {approvalInfo.nickname} · {applicationDate(approvalInfo.approvedAt, true)}</p>}
    {completed ? <p role="status" className="py-6 text-sm">저장되었습니다. 화면을 이동합니다.</p> : !editing ? <div className="space-y-4">
      <p className="font-semibold">{currentStatus} 처리 완료</p>
      {currentStatus === "취소" && currentCancelReason && <p className="whitespace-pre-wrap text-sm leading-6">취소 사유 · {currentCancelReason}</p>}
      {kind === "volunteer" && <p className="text-sm text-muted-foreground">캘린더에 등록된 일정 {linkedEventCount}건</p>}
      {currentNote && <details><summary className="min-h-11 cursor-pointer py-3 text-sm">신청자에게 전달한 안내</summary><p className="whitespace-pre-wrap text-sm leading-6 [overflow-wrap:anywhere]">{currentNote}</p></details>}
      <Link href={returnHref} className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">{applicationBackLabel(returnHref)}</Link>
    </div> : <form onSubmit={event => { event.preventDefault(); void handleSave() }} className="space-y-5">
      <fieldset disabled={busy} className="min-w-0 space-y-5 disabled:opacity-60">
        {reschedule ? <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold">일정변경 요청 처리</legend>
          <p className="mb-3 text-xs leading-5 text-muted-foreground">검토 중에는 저장하지 않고 나가면 요청이 유지됩니다.</p>
          {(["accept", "reject"] as const).map(value => <label key={value} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-border p-3 text-sm has-checked:border-primary has-checked:bg-primary/5">
            <input type="radio" name="decision" checked={decision === value} onChange={() => { setDecision(value); setConfirmed(false); setError(null) }} className="mt-1 accent-primary" />
            {value === "accept" ? "변경 승인 · 요청한 일정으로 교체" : "변경 거절 · 기존 일정 유지"}
          </label>)}
        </fieldset> : <div hidden={freshVolunteer && !advanced}>
          <label htmlFor="application-status" className="mb-2 block text-sm font-semibold">처리 상태</label>
          <select id="application-status" value={status} onChange={event => changeStatus(event.target.value as ApplicationStatus)} className="min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm">
            {STATUS_OPTIONS.map(value => <option key={value}>{value}</option>)}
          </select>
        </div>}
        {kind === "volunteer" && status === "승인" && !reschedule && <fieldset hidden={freshVolunteer && !advanced} className="space-y-2">
          <legend className="mb-2 text-sm font-semibold">캘린더 등록</legend>
          {(["with_schedule", "approval_only"] as const).map(value => <label key={value} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border p-3 text-sm has-checked:border-primary has-checked:bg-primary/5">
            <input type="radio" name="approval-mode" checked={approvalMode === value} onChange={() => { setApprovalMode(value); setConfirmed(false) }} className="accent-primary" />
            {value === "with_schedule" ? "승인 및 일정 등록" : "승인만 · 일정은 등록하지 않음"}
          </label>)}
        </fieldset>}
        {kind === "volunteer" && <div className="rounded-xl bg-muted/50 p-4 text-sm leading-6">
          <p className="font-semibold">{quickApproval ? "승인할 일정" : addsSchedule ? (reschedule ? `기존 ${linkedEventCount}건 → 요청 일정 ${dates.length}건으로 교체` : `기존 ${linkedEventCount}건 유지 · ${newDates.length}건 추가`) : removesSchedule ? `등록된 일정 ${linkedEventCount}건 삭제` : `기존 일정 ${linkedEventCount}건 유지`}</p>
          {addsSchedule && <><ul className="mt-2 space-y-1">{dates.map(date => <li key={date}>{applicationDate(date)} · {time || "시간 미입력"}</li>)}</ul>
            {!validSchedule && <p className="mt-2 text-destructive">등록할 날짜와 시간을 확인해 주세요.</p>}
            {quickApproval && <p className="mt-2 text-sm">{partySize ? `${partySize}명 · ` : ""}캘린더에 {dates.length}건 등록</p>}
            {!reschedule && !quickApproval && <p className="mt-2 text-xs text-muted-foreground">같은 날짜·시간에 등록된 일정은 중복 추가하지 않습니다.</p>}
          </>}
          {removesSchedule && <p className="mt-2 text-xs text-destructive">승인 외 상태로 변경하면 연결된 캘린더 일정이 삭제됩니다.</p>}
          {status === "승인" && !addsSchedule && !linkedEventCount && <p className="mt-2 text-xs text-muted-foreground">승인만 처리됩니다. 캘린더에는 일정이 표시되지 않습니다.</p>}
        </div>}
        {kind === "adoption" && <p className="rounded-lg bg-muted/50 p-3 text-xs leading-5 text-muted-foreground">입양 신청의 상태만 변경합니다. 방문 일정은 자동으로 캘린더에 등록되지 않습니다.</p>}
        {status === "취소" && <div><label htmlFor="cancel-reason" className="mb-2 block text-sm font-semibold">취소 사유 (필수)</label><Textarea id="cancel-reason" required value={cancelReason} onChange={e => setCancelReason(e.target.value)} /></div>}
        <details open={!quickApproval} key={quickApproval ? "quick" : "advanced"}>
          <summary className="min-h-11 cursor-pointer py-3 text-sm">{quickApproval ? "기본 안내 확인·수정" : "신청자 안내"}</summary>
        <div><label htmlFor="application-note" className="mb-2 block text-sm font-semibold">{status === "반려" ? "반려 사유 (필수)" : "신청자 안내"}</label>
          <Textarea id="application-note" value={adminNote} onChange={e => setAdminNote(e.target.value)} rows={6} required={status === "반려"} className="min-h-36" />
          <p className="mt-2 text-xs leading-5 text-muted-foreground">신청자가 마이페이지에서 확인할 수 있는 내용입니다. 내부 메모를 입력하지 마세요.</p>
        </div>
        </details>
        {needsConfirmation && <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-border p-3 text-sm leading-6">
          <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-1.5 size-4 shrink-0 accent-primary" />
          위 일정의 {removesSchedule ? "삭제" : reschedule ? "교체" : "등록"} 내용을 확인했습니다.
        </label>}
      </fieldset>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="space-y-2 border-t border-border pt-4">
        <Button type="submit" disabled={busy} className="min-h-11 w-full whitespace-normal">{pending ? "저장 중…" : actionLabel}</Button>
        {quickApproval && <Button type="button" variant="outline" disabled={busy || !validSchedule} className="min-h-11 w-full whitespace-normal" onClick={() => void handleSave(true)}>승인 후 다음 접수 보기</Button>}
        {freshVolunteer && <Button type="button" variant="ghost" disabled={busy} className="min-h-11 w-full whitespace-normal" onClick={() => { setAdvanced(!advanced); setConfirmed(false); setError(null); if (advanced) { changeStatus("승인"); setApprovalMode(linkedEventCount ? "approval_only" : "with_schedule") } }}> {advanced ? "빠른 승인으로 돌아가기" : "다른 처리 · 검토중·반려·취소"}</Button>}
        <Link href={returnHref} className="flex min-h-11 items-center justify-center rounded-lg text-sm text-muted-foreground hover:bg-muted">저장하지 않고 돌아가기</Link>
      </div>
    </form>}
    {!completed && <details className="mt-5 border-t border-border pt-3">
      <summary className="min-h-11 cursor-pointer py-3 text-xs text-muted-foreground">신청 삭제</summary>
      {!confirmDelete ? <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirmDelete(true)}>삭제 확인</Button> : <div className="space-y-3">
        <p className="text-sm leading-6 [overflow-wrap:anywhere]">{applicantName}님의 신청과 연결된 일정을 삭제합니다. 되돌릴 수 없습니다.</p>
        <div className="flex gap-2"><Button type="button" variant="destructive" disabled={busy} onClick={() => startDelete(async () => {
          const result = kind === "volunteer" ? await deleteVolunteerApplication(id) : await deleteAdoptionApplication(id)
          if (result?.error) setError(result.error)
        })}>{deleting ? "삭제 중…" : "영구 삭제"}</Button><Button type="button" variant="outline" disabled={busy} onClick={() => setConfirmDelete(false)}>닫기</Button></div>
      </div>}
      {!editing && error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
    </details>}
  </section>
}
