"use client"

import Link from "next/link"
import { useRef, useState } from "react"

import { createAdoptionStory, updateAdoptionStory } from "../api/mutations"
import type { StoryWithDog } from "../api/queries"
import { RichTextEditor } from "@/shared/components/rich-text-editor"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { cn } from "@/shared/lib/utils"

export interface DogOption {
  id: string
  name: string
  status: string
}

interface Props {
  story?: StoryWithDog
  dogs: DogOption[]
  cancelHref?: string
  returnTo?: string
}

export function StoryForm({ story, dogs, cancelHref = "/admin/stories", returnTo }: Props) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isEdit = Boolean(story)
  const contentRef = useRef<string>(story?.content ?? "")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setPending(true)
    const formData = new FormData(e.currentTarget)
    formData.set("content", contentRef.current)
    try {
      const result =
        isEdit && story
          ? await updateAdoptionStory(story.id, formData)
          : await createAdoptionStory(formData)
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
          defaultValue={story?.title ?? ""}
          placeholder="예: 뽀삐, 새 가족 품으로"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="dog_id">입양 간 아이 (선택)</Label>
        <select
          id="dog_id"
          name="dog_id"
          defaultValue={story?.dog_id ?? ""}
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          <option value="">— 연결 안 함 —</option>
          {dogs.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} · {d.status}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          연결하면 후기 상세 하단에 해당 아이 프로필 링크가 표시됩니다.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>본문 *</Label>
        <RichTextEditor
          name="content"
          defaultValue={story?.content ?? ""}
          placeholder="입양 후 근황, 새 가족 메시지 등을 자유롭게 적어주세요."
          folder="stories"
          onChange={(html) => { contentRef.current = html }}
        />
        <p className="text-xs text-muted-foreground">
          💡 본문에 삽입된 첫 번째 이미지가 목록 썸네일로 자동 사용됩니다.
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/30 p-3">
        <input
          id="published"
          name="published"
          type="checkbox"
          defaultChecked={story ? Boolean(story.published_at) : true}
          className="size-4 rounded border-input accent-primary"
        />
        <Label htmlFor="published" className="text-sm font-normal">
          바로 공개{" "}
          <span className="text-muted-foreground">
            (체크 해제 시 임시저장)
          </span>
        </Label>
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
