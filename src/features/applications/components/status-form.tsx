"use client"

import { useState, useTransition } from "react"

import {
  deleteAdoptionApplication,
  deleteVolunteerApplication,
  updateAdoptionApplication,
  updateVolunteerApplication,
} from "../api/mutations"
import { Button } from "@/shared/components/ui/button"
import { Label } from "@/shared/components/ui/label"
import { Textarea } from "@/shared/components/ui/textarea"
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
}

export function ApplicationStatusForm({
  id,
  kind,
  currentStatus,
  currentNote,
  applicantName,
}: Props) {
  const [pending, startTransition] = useTransition()
  const [deleting, startDelete] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function handleSubmit(formData: FormData) {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result =
        kind === "adoption"
          ? await updateAdoptionApplication(id, formData)
          : await updateVolunteerApplication(id, formData)
      if (result.error) setError(result.error)
      else setSaved(true)
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
                defaultChecked={s === currentStatus}
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
          defaultValue={currentNote ?? ""}
          placeholder="상담 진행 내용, 특이사항 등을 기록해 두세요."
          className="mt-2"
        />
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="text-sm text-primary">저장되었습니다.</p>
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
