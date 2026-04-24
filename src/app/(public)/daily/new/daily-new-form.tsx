"use client"

import { useActionState } from "react"
import Link from "next/link"
import { createDailyPostAsUser } from "@/features/daily/api/user-actions"
import { AnimalImageUploader } from "@/shared/components/animal-image-uploader"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"

const initial = { error: null as string | null }

export function DailyNewForm() {
  const [state, action, pending] = useActionState(createDailyPostAsUser, initial)

  return (
    <form action={action} className="space-y-6">
      {/* 제목 */}
      <div className="space-y-1.5">
        <label htmlFor="title" className="text-sm font-medium text-foreground">제목 *</label>
        <Input id="title" name="title" placeholder="제목을 입력하세요" maxLength={100} required />
      </div>

      {/* 사진 */}
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-foreground">사진 *</p>
        <AnimalImageUploader folder="daily" maxImages={10} />
      </div>

      {/* 내용 */}
      <div className="space-y-1.5">
        <label htmlFor="content" className="text-sm font-medium text-foreground">내용</label>
        <textarea
          id="content"
          name="content"
          rows={6}
          placeholder="내용을 입력하세요 (선택)"
          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
      </div>

      {state.error && (
        <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{state.error}</p>
      )}

      <div className="flex gap-3">
        <Link href="/daily" className="flex-1 rounded-lg border border-border px-4 py-2.5 text-center text-sm font-medium text-foreground hover:bg-secondary">
          취소
        </Link>
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? "등록 중..." : "등록하기"}
        </Button>
      </div>
    </form>
  )
}
