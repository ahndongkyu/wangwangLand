"use client"

import Link from "next/link"
import { useState, useTransition } from "react"

import { createNotice, updateNotice } from "../api/mutations"
import { RichTextEditor } from "@/shared/components/rich-text-editor"
import { Button } from "@/shared/components/ui/button"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { cn } from "@/shared/lib/utils"
import type { Notice } from "@/shared/types/database"

interface Props {
  notice?: Notice
}

const PRESET_TYPES = ["공지", "이벤트"] as const
type PresetType = (typeof PRESET_TYPES)[number]

/** 기존 제목에서 prefix 감지 후 분리 */
function splitPrefix(title: string): { type: string; body: string } {
  const match = title.match(/^\[(.+?)\]\s*/)
  if (!match) return { type: "", body: title }
  const tag = match[1]
  const isPreset = PRESET_TYPES.includes(tag as PresetType)
  return {
    type: isPreset ? tag : "직접입력",
    body: title.slice(match[0].length),
  }
}

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

export function NoticeForm({ notice }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const isEdit = Boolean(notice)
  const isPublished = Boolean(notice?.published_at)

  // 공지 유형 초기값 (수정 모드: 기존 제목에서 파싱)
  const initial = notice ? splitPrefix(notice.title) : { type: "", body: "" }
  const [noticeType, setNoticeType] = useState(initial.type)   // "", "공지", "이벤트", "직접입력"
  const [customPrefix, setCustomPrefix] = useState(
    initial.type === "직접입력" ? splitPrefix(notice?.title ?? "").type : ""
  )

  // 실제 prefix 문자열
  const resolvedPrefix =
    noticeType === "직접입력"
      ? customPrefix.trim()
      : noticeType              // "공지" | "이벤트" | ""

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

      {/* 공지 유형 */}
      <div className="space-y-1.5">
        <Label htmlFor="notice_type">공지 유형</Label>
        <div className="flex items-center gap-2">
          <select
            id="notice_type"
            name="notice_type"
            value={noticeType}
            onChange={(e) => setNoticeType(e.target.value)}
            className={cn(selectClass, "max-w-[180px]")}
          >
            <option value="">없음</option>
            <option value="공지">생성 공지</option>
            <option value="이벤트">이벤트</option>
            <option value="직접입력">직접입력</option>
          </select>
          {noticeType === "직접입력" && (
            <Input
              placeholder="유형 직접 입력 (예: 긴급)"
              value={customPrefix}
              onChange={(e) => setCustomPrefix(e.target.value)}
              className="max-w-[200px]"
            />
          )}
          {resolvedPrefix && (
            <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-bold text-primary">
              [{resolvedPrefix}]
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          선택 시 제목 앞에 <strong>[유형]</strong> 태그가 자동으로 붙습니다.
        </p>
      </div>

      {/* 제목 */}
      <div className="space-y-1.5">
        <Label htmlFor="title">제목 *</Label>
        <div className="flex items-center gap-2">
          {resolvedPrefix && (
            <span className="shrink-0 rounded-md border border-border bg-secondary px-3 py-2 text-sm font-semibold text-foreground">
              [{resolvedPrefix}]
            </span>
          )}
          <Input
            id="title"
            name="title"
            required
            defaultValue={initial.body || (notice?.title ?? "")}
            placeholder="공지 제목"
            className="flex-1"
          />
        </div>
        {/* prefix를 hidden으로 전송 */}
        <input type="hidden" name="notice_prefix" value={resolvedPrefix} />
      </div>

      {/* 내용 */}
      <div className="space-y-1.5">
        <Label>내용 *</Label>
        <RichTextEditor
          name="content"
          defaultValue={notice?.content ?? ""}
          placeholder="공지 본문을 입력하세요."
          folder="notices"
        />
        <p className="text-xs text-muted-foreground">
          💡 본문에 삽입된 첫 번째 이미지가 목록 썸네일로 자동 사용됩니다.
        </p>
      </div>

      {/* 옵션 */}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-secondary/30 p-4 sm:flex-row sm:items-center sm:gap-6">
        <label htmlFor="is_pinned" className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox
            id="is_pinned"
            name="is_pinned"
            defaultChecked={notice?.is_pinned ?? false}
          />
          상단 고정
        </label>
        <label htmlFor="publish" className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox
            id="publish"
            name="publish"
            defaultChecked={isEdit ? isPublished : true}
          />
          {isEdit
            ? isPublished ? "공개 유지" : "공개로 전환"
            : "바로 공개 (체크 해제 시 임시저장)"}
        </label>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        <Link href="/admin/notices" className="text-sm text-muted-foreground hover:text-foreground">
          취소
        </Link>
        <Button type="submit" disabled={pending}>
          {pending ? "저장 중..." : isEdit ? "수정" : "등록"}
        </Button>
      </div>
    </form>
  )
}
