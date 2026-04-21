"use client"

import Link from "next/link"
import { useState, useTransition } from "react"

import { createNotice, updateNotice } from "../api/mutations"
import { Button } from "@/shared/components/ui/button"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Textarea } from "@/shared/components/ui/textarea"
import type { Notice } from "@/shared/types/database"

interface Props {
  notice?: Notice
}

export function NoticeForm({ notice }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const isEdit = Boolean(notice)
  const isPublished = Boolean(notice?.published_at)

  async function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = isEdit && notice
        ? await updateNotice(notice.id, formData)
        : await createNotice(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <div className="space-y-1.5">
        <Label htmlFor="title">제목 *</Label>
        <Input
          id="title"
          name="title"
          required
          defaultValue={notice?.title ?? ""}
          placeholder="공지 제목"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="content">내용 *</Label>
        <Textarea
          id="content"
          name="content"
          rows={14}
          required
          defaultValue={notice?.content ?? ""}
          placeholder="공지 본문을 입력하세요. 줄바꿈은 그대로 유지됩니다."
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          빈 줄로 문단 구분, 줄바꿈은 그대로 표시됩니다.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-secondary/30 p-4 sm:flex-row sm:items-center sm:gap-6">
        <label
          htmlFor="is_pinned"
          className="flex cursor-pointer items-center gap-2 text-sm"
        >
          <Checkbox
            id="is_pinned"
            name="is_pinned"
            defaultChecked={notice?.is_pinned ?? false}
          />
          상단 고정
        </label>
        <label
          htmlFor="publish"
          className="flex cursor-pointer items-center gap-2 text-sm"
        >
          <Checkbox
            id="publish"
            name="publish"
            defaultChecked={isEdit ? isPublished : true}
          />
          {isEdit
            ? isPublished
              ? "공개 유지"
              : "공개로 전환"
            : "바로 공개 (체크 해제 시 임시저장)"}
        </label>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        <Link
          href="/admin/notices"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          취소
        </Link>
        <Button type="submit" disabled={pending}>
          {pending ? "저장 중..." : isEdit ? "수정" : "등록"}
        </Button>
      </div>
    </form>
  )
}
