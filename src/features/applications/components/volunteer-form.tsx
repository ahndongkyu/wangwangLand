"use client"

import { useRouter } from "next/navigation"
import React, { useState, useTransition } from "react"
import { User, Users } from "lucide-react"

import { submitVolunteerApplication } from "../api/mutations"
import { ConsentSection } from "@/features/legal"
import { DateMultiPicker } from "@/shared/components/date-multi-picker"
import { FormFooter } from "@/shared/components/form-footer"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Textarea } from "@/shared/components/ui/textarea"
import {
  KOREAN_PHONE_PATTERN_RAW,
  NAME_HINT,
  NAME_PATTERN_RAW,
  ORG_OR_PERSON_HINT,
  ORG_OR_PERSON_PATTERN_RAW,
  PHONE_HINT,
  validateKoreanPhone,
  validateName,
  validateOrgOrPersonName,
  validatePartySize,
} from "@/shared/lib/validation"
import type { VolunteerActivity } from "@/shared/types/database"

const ACTIVITIES: VolunteerActivity[] = [
  "산책",
  "목욕·미용",
  "청소·정리",
  "홍보·촬영",
]

interface Props {
  termsAlreadyAgreed?: boolean
}

export function VolunteerForm({ termsAlreadyAgreed = false }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [partyType, setPartyType] = useState<"individual" | "group">("individual")
  const [hasMinor, setHasMinor] = useState(false)
  const [minorGuardian, setMinorGuardian] = useState(false)
  const [safetyAcknowledged, setSafetyAcknowledged] = useState(false)
  const [privacyAgreed, setPrivacyAgreed] = useState(false)
  const [termsAgreed, setTermsAgreed] = useState(termsAlreadyAgreed)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)

    const rawName = String(formData.get("applicant_name") ?? "")
    const nameCheck =
      partyType === "group"
        ? validateOrgOrPersonName(rawName)
        : validateName(rawName)
    if (!nameCheck.valid) return setError(nameCheck.error!)
    const phoneCheck = validateKoreanPhone(String(formData.get("phone") ?? ""))
    if (!phoneCheck.valid) return setError(phoneCheck.error!)
    const partyCheck = validatePartySize(String(formData.get("party_size") ?? "1"))
    if (!partyCheck.valid) return setError(partyCheck.error!)

    if (!safetyAcknowledged) return setError("안전 사항 인지 동의가 필요합니다.")
    if (hasMinor && !minorGuardian) {
      return setError("미성년자 참여 시 보호자 동의가 필요합니다.")
    }
    if (!privacyAgreed) return setError("개인정보 수집·이용 동의가 필요합니다.")
    if (!termsAgreed) return setError("이용약관 동의가 필요합니다.")

    startTransition(async () => {
      const result = await submitVolunteerApplication(formData)
      if (result.error) setError(result.error)
      else setSuccess(true)
    })
  }

  if (success) {
    return (
      <div className="rounded-lg border border-primary bg-primary/5 p-8 text-center">
        <div className="mb-2 text-4xl">🙌</div>
        <h2 className="text-xl font-bold text-foreground">
          봉사 신청이 접수되었습니다
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          운영진이 확인 후 입력하신 연락처로 안내드리겠습니다.
          <br />
          귀한 마음 감사합니다 💕
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* 1. 신청 종류 */}
      <Card title="신청 종류" required>
        <div className="grid grid-cols-2 gap-2">
          <TypeOption
            active={partyType === "individual"}
            Icon={User}
            label="개인 신청"
            onClick={() => setPartyType("individual")}
          />
          <TypeOption
            active={partyType === "group"}
            Icon={Users}
            label="단체 신청"
            desc="학교/기업/종교단체 등"
            onClick={() => setPartyType("group")}
          />
        </div>
      </Card>

      {/* 2. 신청자 정보 */}
      <Card title={partyType === "group" ? "단체 정보" : "신청자 정보"} required>
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            id="applicant_name"
            label={partyType === "group" ? "단체명 / 인솔자 이름" : "이름"}
            required
            className="md:col-span-2"
          >
            <Input
              id="applicant_name"
              name="applicant_name"
              required
              minLength={2}
              maxLength={partyType === "group" ? 30 : 20}
              pattern={
                partyType === "group"
                  ? ORG_OR_PERSON_PATTERN_RAW
                  : NAME_PATTERN_RAW
              }
              title={partyType === "group" ? ORG_OR_PERSON_HINT : NAME_HINT}
              placeholder={
                partyType === "group"
                  ? "예: ○○대학교 봉사동아리 / 인솔자 홍길동"
                  : "홍길동"
              }
            />
            <p className="text-[11px] text-muted-foreground/80">
              {partyType === "group" ? ORG_OR_PERSON_HINT : NAME_HINT}
            </p>
          </Field>
          <Field id="phone" label={partyType === "group" ? "인솔자 연락처" : "연락처"} required>
            <Input
              id="phone"
              name="phone"
              type="tel"
              required
              pattern={KOREAN_PHONE_PATTERN_RAW}
              title={PHONE_HINT}
              placeholder="010-0000-0000"
            />
            <p className="text-[11px] text-muted-foreground/80">{PHONE_HINT}</p>
          </Field>
          <Field id="party_size" label="인원수" required>
            <Input
              id="party_size"
              name="party_size"
              type="number"
              min={1}
              max={20}
              defaultValue={1}
              required
            />
            <p className="text-[11px] text-muted-foreground">
              본인 포함, 최대 20명
            </p>
          </Field>
          {partyType === "group" && (
            <CheckRow
              checked={hasMinor}
              onChange={setHasMinor}
              label="만 14세 미만이 포함됩니다"
              className="md:col-span-2"
            />
          )}
          {hasMinor && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 md:col-span-2 dark:border-amber-900/50 dark:bg-amber-900/20">
              <CheckRow
                checked={minorGuardian}
                onChange={setMinorGuardian}
                label="미성년자 보호자(법정대리인 또는 학교·기관 담당자)의 동의·인솔 하에 참여합니다"
                required
              />
            </div>
          )}
        </div>
      </Card>

      {/* 3. 일정·활동 */}
      <Card title="활동 일정 · 희망 활동">
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">
            가능한 날짜
          </Label>
          <DateMultiPicker name="available_dates" />
          <p className="text-[11px] text-muted-foreground/80">
            여러 날짜 선택 가능. 운영진이 확인 후 가능한 날짜로 일정을 조율합니다.
          </p>
        </div>

        <Field id="available_time" label="가능한 시간대" className="mt-3">
          <Input
            id="available_time"
            name="available_time"
            placeholder="예: 오전 10시 ~ 오후 2시"
          />
        </Field>

        <fieldset className="mt-3 space-y-2">
          <legend className="text-xs font-medium text-muted-foreground">
            희망 활동 (여러 개 선택 가능)
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {ACTIVITIES.map((activity) => (
              <label
                key={activity}
                className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm"
                htmlFor={`act-${activity}`}
              >
                <Checkbox
                  id={`act-${activity}`}
                  name="activities"
                  value={activity}
                />
                {activity}
              </label>
            ))}
          </div>
        </fieldset>
      </Card>

      {/* 4. 자기소개 */}
      <Card title="자기소개 · 메모 (선택)">
        <Field id="message" label="" hideLabel>
          <Textarea
            id="message"
            name="message"
            rows={3}
            placeholder="봉사 경험·궁금한 점 등을 자유롭게 적어주세요."
          />
        </Field>
      </Card>

      {/* 5. 안전 사항 인지 */}
      <Card title="안전 사항 인지" required>
        <p className="mb-2 text-xs leading-relaxed text-muted-foreground">
          보호동물·시설 환경 특성상 봉사 활동 중 일부 위험(물림, 스크래치,
          알레르기 등)이 수반될 수 있습니다.
        </p>
        <CheckRow
          checked={safetyAcknowledged}
          onChange={setSafetyAcknowledged}
          label="위 위험 가능성을 인지하고 단체의 안전 수칙을 준수하겠습니다"
          required
        />
      </Card>

      {/* 6. 동의 */}
      <ConsentSection
        privacy={{
          purpose: "봉사 활동 운영 및 안전 관리, 출입 기록 관리",
          items:
            partyType === "group"
              ? "단체명, 인솔자 이름·연락처, 동행 인원수, 활동 일정"
              : "이름, 연락처, 인원수, 활동 일정",
          retention: "봉사 활동 종료 후 1년",
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
        submitLabel="봉사 신청하기"
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
  className,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  required?: boolean
  className?: string
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-2 py-1 text-sm ${className ?? ""}`}
    >
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

function TypeOption({
  active,
  Icon,
  label,
  desc,
  onClick,
}: {
  active: boolean
  Icon: typeof User
  label: string
  desc?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all ${
        active
          ? "-translate-y-0.5 border-primary bg-primary/10 text-foreground shadow-sm"
          : "border-border bg-background text-muted-foreground hover:text-foreground"
      }`}
    >
      <span className="flex items-center gap-2">
        <Icon
          className={`size-4 ${active ? "text-primary" : "text-muted-foreground"}`}
          aria-hidden
        />
        <span className="text-sm font-semibold text-foreground">{label}</span>
      </span>
      {desc && <span className="text-xs">{desc}</span>}
    </button>
  )
}
