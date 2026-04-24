"use client"

import Link from "next/link"
import { useState, useTransition } from "react"

import { createAdoptionStory, updateAdoptionStory } from "../api/mutations"
import type { StoryWithDog } from "../api/queries"
import { AnimalImageUploader } from "@/shared/components/animal-image-uploader"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Textarea } from "@/shared/components/ui/textarea"
import { cn } from "@/shared/lib/utils"

export interface DogOption {
  id: string
  name: string
  status: string
}

interface Props {
  story?: StoryWithDog
  dogs: DogOption[]
}

export function StoryForm({ story, dogs }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const isEdit = Boolean(story)

  async function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result =
        isEdit && story
          ? await updateAdoptionStory(story.id, formData)
          : await createAdoptionStory(formData)
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
        <Label htmlFor="content">본문 *</Label>
        <Textarea
          id="content"
          name="content"
          required
          rows={20}
          defaultValue={story?.content ?? ""}
          placeholder="입양 후 근황, 새 가족 메시지 등을 자유롭게 적어주세요."
        />
      </div>

      <div className="space-y-1.5">
        <Label>사진 *</Label>
        <AnimalImageUploader
          folder="stories"
          maxImages={10}
          initialImages={story?.images ?? []}
        />
        <p className="text-xs text-muted-foreground">
          입양 후기에는 최대 10장까지 올릴 수 있어요. 첫 번째 사진이 목록 썸네일로 사용됩니다.
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
          href="/admin/stories"
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
