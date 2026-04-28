"use client"

import { useRouter } from "next/navigation"
import React, { useState, useTransition } from "react"

import { submitAdoptionApplication } from "../api/mutations"
import { ConsentSection } from "@/features/legal"
import { AddressSearchInput } from "@/shared/components/address-search-input"
import { FormFooter } from "@/shared/components/form-footer"
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
  /** 회원가입 시 이미 약관에 동의했으면 true (자동 체크) */
  termsAlreadyAgreed?: boolean
}

export function AdoptionForm({ dogId, dogName, termsAlreadyAgreed = false }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // 자격 확인
  const [adult, setAdult] = useState(false)
  const [familyConsent, setFamilyConsent] = useState(false)
  const [readiness, setReadiness] = useState(false)
  // 임대인 동의 (조건부)
  const [ownershipType, setOwnershipType] = useState("")
  const needsLandlord = ownershipType === "전세" || ownershipType === "월세"
  const [landlordConsent, setLandlordConsent] = useState(false)
  // 동의
  const [privacyAgreed, setPrivacyAgreed] = useState(false)
  const [termsAgreed, setTermsAgreed] = useState(termsAlreadyAgreed)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)

    const nameCheck = validateName(String(formData.get("applicant_name") ?? ""))
    if (!nameCheck.valid) return setError(nameCheck.error!)
    const phoneCheck = validateKoreanPhone(String(formData.get("phone") ?? ""))
    if (!phoneCheck.valid) return setError(phoneCheck.error!)

    if (!adult) return setError("만 19세 이상 동의가 필요합니다.")
    if (!familyConsent) return setError("동거 가족 전원의 동의 확인이 필요합니다.")
    if (!readiness) return setError("양육 여건 확인 동의가 필요합니다.")
    if (needsLandlord && !landlordConsent) {
      return setError("전세·월세인 경우 임대인 동의 확인이 필요합니다.")
    }
    if (!privacyAgreed) return setError("개인정보 수집·이용 동의가 필요합니다.")
    if (!termsAgreed) return setError("이용약관 동의가 필요합니다.")

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
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
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

      {/* 1. 신청자 정보 */}
      <Card title="신청자 정보" required>
        <div className="grid gap-4 md:grid-cols-2">
          <Field id="applicant_name" label="이름" required>
            <Input
              id="applicant_name"
              name="applicant_name"
              required
              minLength={2}
              maxLength={50}
              placeholder="홍길동"
            />
          </Field>
          <Field id="phone" label="연락처" required>
            <Input
              id="phone"
              name="phone"
              type="tel"
              required
              pattern="^0\d{1,2}[- ]?\d{3,4}[- ]?\d{4}$"
              placeholder="010-0000-0000"
            />
          </Field>
          <Field id="address" label="주소" required className="md:col-span-2">
            <AddressSearchInput
              id="address"
              name="address"
              required
            />
          </Field>
        </div>
      </Card>

      {/* 2. 입양 자격 확인 (약관 제9조 기반) */}
      <Card title="입양 자격 확인" required>
        <p className="mb-3 text-xs text-muted-foreground">
          왕왕랜드 회칙·약관에 따라 다음 항목 모두 충족해야 입양이 가능합니다.
        </p>
        <CheckRow
          checked={adult}
          onChange={setAdult}
          label="만 19세 이상의 성인입니다"
        />
        <CheckRow
          checked={familyConsent}
          onChange={setFamilyConsent}
          label="동거 가족 전원의 입양 동의를 받았습니다"
        />
        <CheckRow
          checked={readiness}
          onChange={setReadiness}
          label="평생 양육에 필요한 경제적·시간적 여건을 갖추었습니다"
        />
      </Card>

      {/* 3. 가족·주거 정보 */}
      <Card title="가족 · 주거 정보 (선택)">
        <div className="grid gap-4 md:grid-cols-2">
          <Field id="family_size" label="가족 구성원 수">
            <Input
              id="family_size"
              name="family_size"
              type="number"
              min={1}
              placeholder="본인 포함"
            />
          </Field>
          <div className="flex items-center gap-2 pt-7">
            <Checkbox id="has_children" name="has_children" />
            <Label htmlFor="has_children" className="cursor-pointer">
              어린이가 있어요
            </Label>
          </div>
          <Field id="housing_type" label="주거 형태">
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
          </Field>
          <Field id="ownership_type" label="소유 형태">
            <select
              id="ownership_type"
              name="ownership_type"
              value={ownershipType}
              onChange={(e) => setOwnershipType(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring"
            >
              <option value="">선택</option>
              {OWNERSHIP.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {needsLandlord && (
          <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-900/20">
            <CheckRow
              checked={landlordConsent}
              onChange={setLandlordConsent}
              label="임대인의 반려동물 양육 동의를 받았습니다 (필수)"
              required
            />
          </div>
        )}
      </Card>

      {/* 4. 반려 경험 */}
      <Card title="반려 경험 (선택)">
        <Field id="current_pets" label="현재 다른 반려동물">
          <Textarea
            id="current_pets"
            name="current_pets"
            rows={2}
            placeholder="종류·성별·나이 등"
          />
        </Field>
        <Field id="past_pet_experience" label="과거 사육 경험" className="mt-3">
          <Textarea
            id="past_pet_experience"
            name="past_pet_experience"
            rows={2}
          />
        </Field>
      </Card>

      {/* 5. 입양 결심 이유 */}
      <Card title="입양 결심 이유" required>
        <Field id="reason" label="" hideLabel>
          <Textarea
            id="reason"
            name="reason"
            rows={5}
            required
            placeholder="이 아이를 가족으로 맞이하고 싶은 마음을 자유롭게 적어주세요."
          />
        </Field>
      </Card>

      {/* 6. 동의 */}
      <ConsentSection
        privacy={{
          purpose: "입양 상담 및 사후 모니터링",
          items: "이름, 연락처, 주소, 가족/주거 정보, 반려 경험, 입양 결심 이유",
          retention: "입양 완료 또는 상담 종료 후 1년",
        }}
        privacyAgreed={privacyAgreed}
        onPrivacyChange={setPrivacyAgreed}
        termsAgreed={termsAgreed}
        onTermsChange={setTermsAgreed}
        termsAlreadyAgreed={termsAlreadyAgreed}
      />

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <FormFooter
        pending={pending}
        submitLabel="입양 신청하기"
        pendingLabel="접수 중..."
        onCancel={() => router.back()}
      />
    </form>
  )
}

function Card({
  title,
  required,
  children,
}: {
  title: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-4 md:p-5">
      <h3 className="mb-3 text-sm font-semibold text-foreground">
        {title}
        {required && <span className="ml-1 text-destructive">*</span>}
      </h3>
      {children}
    </section>
  )
}

function Field({
  id,
  label,
  required,
  hideLabel,
  className,
  children,
}: {
  id: string
  label: string
  required?: boolean
  hideLabel?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      {!hideLabel && (
        <Label htmlFor={id}>
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </Label>
      )}
      {children}
    </div>
  )
}

function CheckRow({
  checked,
  onChange,
  label,
  required,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  required?: boolean
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 py-1 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 accent-primary"
      />
      <span className="flex-1 leading-relaxed text-foreground">
        {required && (
          <span className="mr-1 rounded-full bg-destructive/15 px-1.5 text-[10px] font-bold text-destructive">
            필수
          </span>
        )}
        {label}
      </span>
    </label>
  )
}
