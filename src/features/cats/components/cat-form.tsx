"use client"

import Link from "next/link"
import { useState, useTransition } from "react"

import { createCat, updateCat } from "../api/mutations"
import { AnimalImageUploader } from "@/shared/components/animal-image-uploader"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Textarea } from "@/shared/components/ui/textarea"
import type { Cat, DogGender, DogStatus } from "@/shared/types/database"

interface Props {
  cat?: Cat
}

const STATUS_OPTIONS: DogStatus[] = [
  "보호중",
  "임시보호중",
  "입양완료",
  "무지개다리",
]
const GENDER_OPTIONS: DogGender[] = ["수컷", "암컷", "미상"]

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

export function CatForm({ cat }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const isEdit = Boolean(cat)

  async function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = isEdit && cat
        ? await updateCat(cat.id, formData)
        : await createCat(formData)
      if (result?.error) setError(result.error)
    })
  }

  const neuteredDefault =
    cat?.neutered === true ? "true" : cat?.neutered === false ? "false" : ""

  return (
    <form action={handleSubmit} className="space-y-6">
      <div className="space-y-1.5">
        <Label>사진</Label>
        <AnimalImageUploader
          folder="cats"
          initialImages={cat?.images ?? []}
          initialThumbnailIndex={cat?.thumbnail_index ?? 0}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">이름 *</Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={cat?.name ?? ""}
            placeholder="예: 나비"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="breed">품종</Label>
          <Input
            id="breed"
            name="breed"
            defaultValue={cat?.breed ?? ""}
            placeholder="예: 코리안숏헤어"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gender">성별</Label>
          <select
            id="gender"
            name="gender"
            defaultValue={cat?.gender ?? "미상"}
            className={selectClass}
          >
            {GENDER_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="status">상태</Label>
          <select
            id="status"
            name="status"
            defaultValue={cat?.status ?? "보호중"}
            className={selectClass}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="neutered">중성화</Label>
          <select
            id="neutered"
            name="neutered"
            defaultValue={neuteredDefault}
            className={selectClass}
          >
            <option value="">미상</option>
            <option value="true">완료</option>
            <option value="false">미완료</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="age_months">나이 (개월)</Label>
          <Input
            id="age_months"
            name="age_months"
            type="number"
            min={0}
            defaultValue={cat?.age_months ?? ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="weight_kg">몸무게 (kg)</Label>
          <Input
            id="weight_kg"
            name="weight_kg"
            type="number"
            min={0}
            step={0.1}
            defaultValue={cat?.weight_kg ?? ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rescue_date">구조일</Label>
          <Input
            id="rescue_date"
            name="rescue_date"
            type="date"
            defaultValue={cat?.rescue_date ?? ""}
          />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="kennel_location">보호 위치 (어드민 전용)</Label>
          <Input
            id="kennel_location"
            name="kennel_location"
            defaultValue={cat?.kennel_location ?? ""}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="personality">성격</Label>
        <Textarea
          id="personality"
          name="personality"
          rows={3}
          defaultValue={cat?.personality ?? ""}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="health_info">건강 정보</Label>
        <Textarea
          id="health_info"
          name="health_info"
          rows={3}
          defaultValue={cat?.health_info ?? ""}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">소개글</Label>
        <Textarea
          id="description"
          name="description"
          rows={5}
          defaultValue={cat?.description ?? ""}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        <Link
          href="/admin/cats"
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
