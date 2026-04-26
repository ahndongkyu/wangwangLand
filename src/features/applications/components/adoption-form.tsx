"use client"

import React, { useState, useTransition } from "react"

import { submitAdoptionApplication } from "../api/mutations"
import { Button } from "@/shared/components/ui/button"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Textarea } from "@/shared/components/ui/textarea"
import {
  validateKoreanPhone,
  validateName,
} from "@/shared/lib/validation"
import type { HousingType, OwnershipType } from "@/shared/types/database"

const HOUSING: HousingType[] = ["아파트", "주택", "빌라", "오피스텔", "기타"]
const OWNERSHIP: OwnershipType[] = ["자가", "전세", "월세"]

interface Props {
  dogId?: string
  dogName?: string
}

export function AdoptionForm({ dogId, dogName }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)

    const nameCheck = validateName(String(formData.get("applicant_name") ?? ""))
    if (!nameCheck.valid) {
      setError(nameCheck.error!)
      return
    }
    const phoneCheck = validateKoreanPhone(String(formData.get("phone") ?? ""))
    if (!phoneCheck.valid) {
      setError(phoneCheck.error!)
      return
    }

    if (formData.get("privacy_agreed") !== "on") {
      setError("개인정보 수집·이용 동의가 필요합니다.")
      return
    }

    startTransition(async () => {
      const result = await submitAdoptionApplication(formData)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
      }
    })
  }

  if (success) {
    return (
      <div className="rounded-lg border border-primary bg-primary/5 p-8 text-center">
        <div className="mb-2 text-4xl">🐾</div>
        <h2 className="text-xl font-bold text-foreground">
          입양 신청이 접수되었습니다
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          운영진이 확인 후 입력하신 연락처로 안내드리겠습니다.
          <br />
          소중한 관심 진심으로 감사합니다 💕
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {dogId && (
        <>
          <input type="hidden" name="dog_id" value={dogId} />
          {dogName && (
            <div className="rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
              <strong>{dogName}</strong> 아이를 입양 신청하고 있습니다.
            </div>
          )}
        </>
      )}

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-foreground">
          기본 정보
        </legend>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="applicant_name">이름 *</Label>
            <Input
              id="applicant_name"
              name="applicant_name"
              required
              minLength={2}
              maxLength={50}
              placeholder="홍길동"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">연락처 *</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              required
              pattern="^0\d{1,2}[- ]?\d{3,4}[- ]?\d{4}$"
              placeholder="010-0000-0000"
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="address">주소 *</Label>
            <Input
              id="address"
              name="address"
              required
              minLength={5}
              maxLength={100}
              placeholder="시/도 시/군/구까지"
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-foreground">
          가족 · 주거 정보
        </legend>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="family_size">가족 구성원 수</Label>
            <Input
              id="family_size"
              name="family_size"
              type="number"
              min={1}
              placeholder="본인 포함"
            />
          </div>
          <div className="flex items-center gap-2 pt-7">
            <Checkbox id="has_children" name="has_children" />
            <Label htmlFor="has_children" className="cursor-pointer">
              어린이가 있어요
            </Label>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="housing_type">주거 형태</Label>
            <select
              id="housing_type"
              name="housing_type"
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring"
            >
              <option value="">선택</option>
              {HOUSING.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ownership_type">소유 형태</Label>
            <select
              id="ownership_type"
              name="ownership_type"
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring"
            >
              <option value="">선택</option>
              {OWNERSHIP.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-foreground">
          반려 경험
        </legend>
        <div className="space-y-1.5">
          <Label htmlFor="current_pets">현재 다른 반려동물</Label>
          <Textarea
            id="current_pets"
            name="current_pets"
            rows={2}
            placeholder="종류·성별·나이 등"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="past_pet_experience">과거 사육 경험</Label>
          <Textarea
            id="past_pet_experience"
            name="past_pet_experience"
            rows={2}
          />
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor="reason">입양을 결심하신 이유 *</Label>
        <Textarea
          id="reason"
          name="reason"
          rows={5}
          required
          placeholder="이 아이를 가족으로 맞이하고 싶은 마음을 자유롭게 적어주세요."
        />
      </div>

      <div className="flex items-start gap-2 rounded-md border border-border bg-secondary/40 p-4">
        <Checkbox id="privacy_agreed" name="privacy_agreed" className="mt-0.5" />
        <Label htmlFor="privacy_agreed" className="cursor-pointer text-sm leading-relaxed">
          개인정보(이름·연락처·주소·가족/주거 정보)를 입양 상담 목적으로
          수집·이용하는 데 동의합니다. 정보는 상담 종료 또는 입양 완료 후 1년간
          보관되며 그 후 안전하게 파기됩니다.
        </Label>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "접수 중..." : "입양 신청하기"}
      </Button>
    </form>
  )
}
