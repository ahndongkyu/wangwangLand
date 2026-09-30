"use client"

import Link from "next/link"
import { useRef, useState } from "react"

import { createNotice, updateNotice } from "../api/mutations"
import { ExpenseAttachmentUploader } from "./expense-attachment-uploader"
import { RichTextEditor } from "@/shared/components/rich-text-editor"
import { Button } from "@/shared/components/ui/button"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Textarea } from "@/shared/components/ui/textarea"
import { cn } from "@/shared/lib/utils"
import type { Notice, NoticeBoardType } from "@/shared/types/database"

interface Props {
  notice?: Notice
  boardType?: NoticeBoardType
  cancelHref?: string
}

const PRESET_TYPES = ["공지", "이벤트", "모집"] as const
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

export function NoticeForm({ notice, boardType = "notice", cancelHref = "/admin/notices" }: Props) {
  const [pending, setPending] = useState(false)
  const [attachmentsUploading, setAttachmentsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isEdit = Boolean(notice)
  const isPublished = Boolean(notice?.published_at)
  const isExpense = boardType === "expense"

  // 공지 유형 초기값 (수정 모드: 기존 제목에서 파싱)
  const initial = notice && !isExpense ? splitPrefix(notice.title) : { type: "", body: notice?.title ?? "" }
  const [noticeType, setNoticeType] = useState(initial.type)   // "", "공지", "이벤트", "직접입력"
  const [customPrefix, setCustomPrefix] = useState(
    initial.type === "직접입력" ? splitPrefix(notice?.title ?? "").type : ""
  )

  // 실제 prefix 문자열
  const resolvedPrefix =
    noticeType === "직접입력"
      ? customPrefix.trim()
      : noticeType              // "공지" | "이벤트" | ""

  const contentRef = useRef<string>(notice?.content === "<p></p>" ? "" : notice?.content ?? "")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setPending(true)
    const formData = new FormData(e.currentTarget)
    formData.set("content", contentRef.current)
    try {
      const result = isEdit && notice
        ? await updateNotice(notice.id, formData, boardType)
        : await createNotice(formData, boardType)
      if (result?.error) {
        setError(result.error)
      } else if (result?.redirectTo) {
        window.location.href = result.redirectTo
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* 상단 저장 버튼 */}
      <div className="flex items-center justify-end gap-2 border-b border-border pb-4">
        <Link href={cancelHref} className="text-sm text-muted-foreground hover:text-foreground">
          취소
        </Link>
        <Button type="submit" disabled={pending || attachmentsUploading}>
          {pending ? "저장 중..." : isEdit ? "수정" : "등록"}
        </Button>
      </div>

      {/* 공지 유형 */}
      {!isExpense && <div className="space-y-1.5">
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
            <option value="공지">공지</option>
            <option value="이벤트">이벤트</option>
            <option value="모집">모집</option>
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
      </div>}

      {/* 제목 */}
      <div className="space-y-1.5">
        <Label htmlFor="title">{isExpense ? "지출 내역 제목 *" : "제목 *"}</Label>
        <div className="flex items-center gap-2">
          {!isExpense && resolvedPrefix && (
            <span className="shrink-0 rounded-md border border-border bg-secondary px-3 py-2 text-sm font-semibold text-foreground">
              [{resolvedPrefix}]
            </span>
          )}
          <Input
            id="title"
            name="title"
            required
            defaultValue={initial.body || (notice?.title ?? "")}
            placeholder={isExpense ? "예: 2026년 9월 지출 내역" : "공지 제목"}
            className="flex-1"
          />
        </div>
        {!isExpense && <input type="hidden" name="notice_prefix" value={resolvedPrefix} />}
      </div>

      {/* 내용 */}
      <div className="space-y-1.5">
        <Label>{isExpense ? "메모 (선택)" : "내용 *"}</Label>
        {isExpense ? (
          <Textarea
            name="content"
            defaultValue={notice?.content === "<p></p>" ? "" : notice?.content ?? ""}
            placeholder="지출 내역에 대한 간단한 설명을 입력하세요."
            className="min-h-32 resize-y"
            onChange={(event) => { contentRef.current = event.target.value }}
          />
        ) : (
          <>
            <RichTextEditor
              name="content"
              defaultValue={notice?.content ?? ""}
              placeholder="공지 본문을 입력하세요."
              folder="notices"
              onChange={(html) => { contentRef.current = html }}
            />
            <p className="text-xs text-muted-foreground">
              본문에 삽입된 첫 번째 이미지가 목록 썸네일로 자동 사용됩니다.
            </p>
          </>
        )}
      </div>

      {isExpense && <ExpenseAttachmentUploader defaultValue={notice?.attachments ?? []} onUploadingChange={setAttachmentsUploading} />}

      {/* 옵션 */}
      {isExpense ? (
        <div className="rounded-lg border border-border bg-secondary/30 p-4">
          <label htmlFor="home_visible" className="flex cursor-pointer items-start gap-2 text-sm">
            <Checkbox id="home_visible" name="home_visible" defaultChecked={notice?.home_visible ?? false} className="mt-0.5" />
            <span>
              <span className="block font-medium text-foreground">홈 화면 노출 준비</span>
              <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">현재는 노출 여부만 저장합니다. 추후 홈 화면에 지출 내역을 추가할 때 켠 항목만 사용할 수 있습니다.</span>
            </span>
          </label>
        </div>
      ) : <div className="flex flex-col gap-3 rounded-lg border border-border bg-secondary/30 p-4 sm:flex-row sm:items-center sm:gap-6">
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
      </div>}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        <Link href={cancelHref} className="text-sm text-muted-foreground hover:text-foreground">
          취소
        </Link>
        <Button type="submit" disabled={pending || attachmentsUploading}>
          {pending ? "저장 중..." : isEdit ? "수정" : "등록"}
        </Button>
      </div>
    </form>
  )
}
