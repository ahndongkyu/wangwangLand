"use client"

import Link from "next/link"
import { Pin, PinOff } from "lucide-react"
import { useState, useTransition } from "react"

import { createDog, updateDog, toggleDogPin } from "../api/mutations"
import { AnimalImageUploader } from "@/shared/components/animal-image-uploader"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Textarea } from "@/shared/components/ui/textarea"
import { ageMonthsFromBirthDate, formatAgeMonths } from "@/shared/lib/age"
import { cn } from "@/shared/lib/utils"
import type { Dog, DogGender, DogSize, DogStatus } from "@/shared/types/database"

interface Props {
  dog?: Dog
}

const STATUS_OPTIONS: DogStatus[] = [
  "보호중",
  "임시보호중",
  "입양완료",
  "무지개다리",
]
const GENDER_OPTIONS: DogGender[] = ["수컷", "암컷", "미상"]
const SIZE_OPTIONS: DogSize[] = ["소", "중소", "중", "중대", "대", "대대"]

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

export function DogForm({ dog }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [birthDate, setBirthDate] = useState(dog?.birth_date ?? "")
  const [pinned, setPinned] = useState(dog?.is_pinned ?? false)
  const [pinPending, startPinTransition] = useTransition()
  const [pinError, setPinError] = useState<string | null>(null)
  const isEdit = Boolean(dog)

  // 생년월일이 있으면 그로부터, 없으면 age_months 필드에서 오늘 기준 나이.
  const computedAgeText = birthDate
    ? formatAgeMonths(ageMonthsFromBirthDate(birthDate))
    : null

  async function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = isEdit && dog
        ? await updateDog(dog.id, formData)
        : await createDog(formData)
      if (result?.error) setError(result.error)
    })
  }

  const neuteredDefault =
    dog?.neutered === true ? "true" : dog?.neutered === false ? "false" : ""

  function handlePinToggle() {
    if (!dog) return
    setPinError(null)
    const next = !pinned
    startPinTransition(async () => {
      const result = await toggleDogPin(dog.id, next)
      if (result.error) {
        setPinError(result.error)
      } else {
        setPinned(next)
      }
    })
  }

  return (
    <>
    {/* 고정 토글 — 수정 페이지에서만 표시, 폼 저장과 독립적으로 즉시 반영 */}
    {isEdit && dog && (
      <div className="mb-6 flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2.5">
          {pinned ? (
            <Pin className="size-4 text-primary" />
          ) : (
            <PinOff className="size-4 text-muted-foreground" />
          )}
          <div>
            <p className="text-sm font-semibold text-foreground">
              홈 화면 고정
            </p>
            <p className="text-xs text-muted-foreground">
              {pinned
                ? "현재 '새 가족을 기다려요' 섹션에 고정되어 있어요."
                : "활성화하면 홈 화면 상단에 우선 노출돼요. (최대 8마리)"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handlePinToggle}
          disabled={pinPending}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50",
            pinned ? "bg-primary" : "bg-input"
          )}
          role="switch"
          aria-checked={pinned}
        >
          <span
            className={cn(
              "pointer-events-none inline-block size-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out",
              pinned ? "translate-x-5" : "translate-x-0"
            )}
          />
        </button>
      </div>
    )}
    {pinError && (
      <p className="mb-4 text-sm text-destructive" role="alert">{pinError}</p>
    )}
    <form action={handleSubmit} className="space-y-6">
      <div className="space-y-1.5">
        <Label>사진</Label>
        <AnimalImageUploader
          folder="dogs"
          initialImages={dog?.images ?? []}
          initialThumbnailIndex={dog?.thumbnail_index ?? 0}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">이름 *</Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={dog?.name ?? ""}
            placeholder="예: 구름이"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="breed">품종</Label>
          <Input
            id="breed"
            name="breed"
            defaultValue={dog?.breed ?? ""}
            placeholder="예: 믹스(백구)"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="size">크기</Label>
          <select
            id="size"
            name="size"
            defaultValue={dog?.size ?? ""}
            className={selectClass}
          >
            <option value="">선택</option>
            {SIZE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gender">성별</Label>
          <select
            id="gender"
            name="gender"
            defaultValue={dog?.gender ?? "미상"}
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
            defaultValue={dog?.status ?? "보호중"}
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
          <Label htmlFor="birth_date">생년월일</Label>
          <Input
            id="birth_date"
            name="birth_date"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            {computedAgeText
              ? `오늘 기준 ${computedAgeText} · 나이는 자동 계산`
              : "정확히 알 때만 입력. 모르면 아래 '추정 나이' 에 개월수만 적어주세요."}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="age_months">추정 나이 (개월)</Label>
          <Input
            id="age_months"
            name="age_months"
            type="number"
            min={0}
            defaultValue={dog?.age_months ?? ""}
            placeholder="예: 24"
            disabled={!!birthDate}
          />
          <p className="text-xs text-muted-foreground">
            {birthDate
              ? "생년월일 입력 시 자동 계산되어 이 값은 덮어씌워집니다."
              : "생년월일을 모를 때만 직접 입력하세요."}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="weight_kg">몸무게 (kg)</Label>
          <Input
            id="weight_kg"
            name="weight_kg"
            type="number"
            min={0}
            step={0.1}
            defaultValue={dog?.weight_kg ?? ""}
            placeholder="예: 4.5"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="kennel_location">보호 위치 (어드민 전용)</Label>
          <Input
            id="kennel_location"
            name="kennel_location"
            defaultValue={dog?.kennel_location ?? ""}
            placeholder="예: 견사1 / 딸기밭2 / 컨테이너1"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="personality">성격</Label>
        <Textarea
          id="personality"
          name="personality"
          rows={3}
          defaultValue={dog?.personality ?? ""}
          placeholder="예: 사람을 좋아하고 다른 강아지와도 잘 어울려요."
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="health_info">건강 정보</Label>
        <Textarea
          id="health_info"
          name="health_info"
          rows={3}
          defaultValue={dog?.health_info ?? ""}
          placeholder="예: 기본 접종 완료, 회충 치료 완료"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">소개글 · 특이사항</Label>
        <Textarea
          id="description"
          name="description"
          rows={5}
          defaultValue={dog?.description ?? ""}
          placeholder="이 아이의 구조 배경, 사연 등을 자유롭게 적어주세요."
        />
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        <Link
          href="/admin/dogs"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          취소
        </Link>
        <Button type="submit" disabled={pending}>
          {pending ? "저장 중..." : isEdit ? "수정" : "등록"}
        </Button>
      </div>
    </form>
    </>
  )
}
