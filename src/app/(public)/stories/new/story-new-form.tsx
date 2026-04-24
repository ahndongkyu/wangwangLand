"use client"

import { useActionState } from "react"
import Link from "next/link"
import { createStoryAsUser } from "@/features/stories/api/user-actions"
import { AnimalImageUploader } from "@/shared/components/animal-image-uploader"
import { RichTextEditor } from "@/shared/components/rich-text-editor"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"

const initial = { error: null as string | null }

export function StoryNewForm() {
  const [state, action, pending] = useActionState(createStoryAsUser, initial)

  return (
    <form action={action} className="space-y-6">
      {/* 제목 */}
      <div className="space-y-1.5">
        <label htmlFor="title" className="text-sm font-medium text-foreground">제목 *</label>
        <Input id="title" name="title" placeholder="예: 몽이와 함께한 첫 한 달" maxLength={100} required />
      </div>

      {/* 사진 */}
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-foreground">사진 *</p>
        <AnimalImageUploader folder="stories" maxImages={10} />
      </div>

      {/* 내용 */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">내용 *</label>
        <RichTextEditor
          name="content"
          placeholder="아이와의 소중한 이야기를 써주세요..."
          folder="stories"
        />
      </div>

      {state.error && (
        <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{state.error}</p>
      )}

      <div className="flex gap-3">
        <Link href="/stories" className="flex h-10 flex-1 items-center justify-center rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary">
          취소
        </Link>
        <Button type="submit" disabled={pending} className="h-10 flex-1">
          {pending ? "등록 중..." : "등록하기"}
        </Button>
      </div>
    </form>
  )
}
