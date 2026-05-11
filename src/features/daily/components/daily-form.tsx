"use client"

import Link from "next/link"
import { useRef, useState } from "react"

import { createDailyPost, updateDailyPost } from "../api/mutations"
import { RichTextEditor } from "@/shared/components/rich-text-editor"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { cn } from "@/shared/lib/utils"
import type { DailyPost, DailyCategory } from "@/shared/types/database"

const DAILY_CATEGORIES: DailyCategory[] = ["일상", "구조 소식", "입소", "임시보호", "봉사 현장", "시설 안내", "후원 소식", "봉사 후기"]

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

interface Props {
  post?: DailyPost
  cancelHref?: string
  returnTo?: string
  /** 봉사 인증 모드 — 카테고리 "봉사 후기" 잠금 + 신청 ID 자동 첨부 */
  volunteerApplicationId?: string
  defaultCategory?: DailyCategory
}

function toDateValue(iso?: string) {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  // Convert to YYYY-MM-DD in local timezone
  const tzOffset = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10)
}

export function DailyForm({
  post,
  cancelHref = "/admin/daily",
  returnTo,
  volunteerApplicationId,
  defaultCategory,
}: Props) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isEdit = Boolean(post)
  const contentRef = useRef<string>(post?.content ?? "")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setPending(true)
    const formData = new FormData(e.currentTarget)
    formData.set("content", contentRef.current)
    const date = String(formData.get("posted_at") ?? "")
    if (date) {
      formData.set("posted_at", new Date(`${date}T12:00:00`).toISOString())
    } else {
      formData.delete("posted_at")
    }
    try {
      const result = isEdit && post
        ? await updateDailyPost(post.id, formData)
        : await createDailyPost(formData)
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
      {returnTo && <input type="hidden" name="_returnTo" value={returnTo} />}

      {/* 상단 저장 버튼 */}
      <div className="flex items-center justify-end gap-2 border-b border-border pb-4">
        <Link href={cancelHref} className="text-sm text-muted-foreground hover:text-foreground">
          취소
        </Link>
        <Button type="submit" disabled={pending}>
          {pending ? "저장 중..." : isEdit ? "수정" : "등록"}
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="title">제목 *</Label>
        <Input
          id="title"
          name="title"
          required
          defaultValue={post?.title ?? ""}
          placeholder="예: 4.21.화 왕왕랜드 일상"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="category">카테고리</Label>
        {volunteerApplicationId ? (
          <>
            <input type="hidden" name="category" value="봉사 후기" />
            <input type="hidden" name="related_volunteer_application_id" value={volunteerApplicationId} />
            <div className="flex items-center gap-2 rounded-md border border-pink-200 bg-pink-50 px-3 py-2 text-sm dark:border-pink-900/40 dark:bg-pink-900/20">
              <span className="rounded-full bg-pink-100 px-2 py-0.5 text-[11px] font-semibold text-pink-700 dark:bg-pink-900/40 dark:text-pink-300">
                봉사 후기
              </span>
              <span className="text-xs text-muted-foreground">봉사 인증글 — 사진 1장 이상 필수</span>
            </div>
          </>
        ) : (
        <select
          id="category"
          name="category"
          defaultValue={post?.category ?? defaultCategory ?? ""}
          className={cn(selectClass, "max-w-[200px]")}
        >
          <option value="">— 없음 —</option>
          {DAILY_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="posted_at">날짜</Label>
        <Input
          id="posted_at"
          name="posted_at"
          type="date"
          defaultValue={toDateValue(post?.posted_at)}
        />
        <p className="text-xs text-muted-foreground">
          비워두면 오늘 날짜로 등록됩니다.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>본문</Label>
        <RichTextEditor
          name="content"
          defaultValue={post?.content ?? ""}
          placeholder="오늘 봉사 활동, 아이들 근황 등을 자유롭게 적어주세요."
          folder="daily"
          onChange={(html) => { contentRef.current = html }}
        />
        <p className="text-xs text-muted-foreground">
          💡 본문에 삽입된 첫 번째 이미지가 목록 썸네일로 자동 사용됩니다.
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        <Link
          href={cancelHref}
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
