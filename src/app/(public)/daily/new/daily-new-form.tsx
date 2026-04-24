"use client"

import { useActionState } from "react"
import Link from "next/link"
import { createDailyPostAsUser } from "@/features/daily/api/user-actions"
import { RichTextEditor } from "@/shared/components/rich-text-editor"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"

const initial = { error: null as string | null }

export function DailyNewForm() {
  const [state, action, pending] = useActionState(createDailyPostAsUser, initial)

  return (
    <form action={action} className="space-y-6">
      {/* 제목 */}
      <div className="space-y-1.5">
        <Label htmlFor="title">제목 *</Label>
        <Input
          id="title"
          name="title"
          required
          maxLength={100}
          placeholder="예: 4.21.화 왕왕랜드 일상"
        />
      </div>

      {/* 본문 */}
      <div className="space-y-1.5">
        <Label>본문</Label>
        <RichTextEditor
          name="content"
          placeholder="오늘 봉사 활동, 아이들 근황 등을 자유롭게 적어주세요."
          folder="daily"
        />
        <p className="text-xs text-muted-foreground">
          💡 본문에 삽입된 첫 번째 이미지가 목록 썸네일로 자동 사용됩니다.
        </p>
      </div>

      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        <Link
          href="/daily"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          취소
        </Link>
        <Button type="submit" disabled={pending}>
          {pending ? "등록 중..." : "등록"}
        </Button>
      </div>
    </form>
  )
}
