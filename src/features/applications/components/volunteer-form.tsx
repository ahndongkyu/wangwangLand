"use client"

import { useRouter } from "next/navigation"
import React, { useRef, useState, useTransition } from "react"
import { ChevronLeft, User, Users } from "lucide-react"

import { submitVolunteerApplication } from "../api/mutations"
import {
  getVolunteerTimeOptions,
  validateVolunteerSchedule,
} from "../lib/volunteer-operating-hours"
import { VolunteerTimeField } from "./volunteer-time-field"
import {
  LargeGroupInquiry,
  VolunteerApplicationGuide,
} from "./volunteer-application-guide"
import { ConsentSection } from "@/features/legal"
import { DateMultiPicker } from "@/shared/components/date-multi-picker"
import { FormFooter } from "@/shared/components/form-footer"
import { PhoneInput } from "@/shared/components/phone-input"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Textarea } from "@/shared/components/ui/textarea"
import {
  NAME_HINT,
  NAME_PATTERN_RAW,
  ORG_OR_PERSON_HINT,
  ORG_OR_PERSON_PATTERN_RAW,
  PHONE_HINT,
  validateGroupPartySize,
  validateKoreanPhone,
  validateName,
  validateOrgOrPersonName,
} from "@/shared/lib/validation"
import { cn } from "@/shared/lib/utils"
import type { VolunteerActivity } from "@/shared/types/database"

const ACTIVITIES: VolunteerActivity[] = [
  "산책",
  "목욕·미용",
  "청소·정리",
  "홍보·촬영",
]

const stepLabels = ["신청자 정보", "활동 일정", "동의 및 제출"]

type VolunteerFieldErrorKey =
  | "group_name"
  | "applicant_name"
  | "phone"
  | "party_size"
  | "minor_guardian"
  | "available_dates"
  | "available_time"
  | "safety_acknowledged"
  | "privacy_agreed"
  | "terms_agreed"

type VolunteerFieldErrors = Partial<Record<VolunteerFieldErrorKey, string>>

interface StaffEntry {
  user_nickname: string
  start_time: string | null
  end_time: string | null
  note: string | null
}

interface Props {
  termsAlreadyAgreed?: boolean
  /** 날짜별 출근 예정 운영진 데이터 (서버에서 사전 fetch) */
  staffByDate?: Record<string, StaffEntry[]>
  /** 로그인 회원의 등록 핸드폰번호 — 연락처 자동 입력용 */
  profilePhone?: string
  /** 정기봉사가 있는 날짜 (YYYY-MM-DD) — 단체 신청 차단용 */
  regularVolunteerDates?: string[]
  /** 단체 차단 기준 인원 (이 인원 이상이면 정기봉사 날 신청 불가) */
  groupBlockThreshold?: number
}

function formatTime(t: string | null): string | null {
  if (!t) return null
  return t.slice(0, 5)
}

export function VolunteerForm({
  termsAlreadyAgreed = false,
  staffByDate = {},
  profilePhone = "",
  regularVolunteerDates = [],
  groupBlockThreshold = 5,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<VolunteerFieldErrors>({})
  const [success, setSuccess] = useState(false)
  const [step, setStep] = useState(1)
  const formRef = useRef<HTMLFormElement>(null)
  const stepAnchorRef = useRef<HTMLDivElement>(null)

  const [visitHour, setVisitHour] = useState("")
  const [visitMinute, setVisitMinute] = useState("")
  const visitTime = visitHour && visitMinute ? `${visitHour}:${visitMinute}` : ""

  const [partyType, setPartyType] = useState<"individual" | "group">("individual")
  const [partySize, setPartySize] = useState("2")
  const [hasMinor, setHasMinor] = useState(false)
  const [minorGuardian, setMinorGuardian] = useState(false)
  const [safetyAcknowledged, setSafetyAcknowledged] = useState(false)
  const [privacyAgreed, setPrivacyAgreed] = useState(false)
  const [termsAgreed, setTermsAgreed] = useState(termsAlreadyAgreed)
  const [selectedDates, setSelectedDates] = useState<string[]>([])

  // 단체(기준 인원 이상)면 정기봉사 날짜 선택 차단
  const groupBlocking =
    partyType === "group" && Number(partySize) >= groupBlockThreshold
  const blockedDates = groupBlocking ? regularVolunteerDates : []

  function clearFieldError(field: VolunteerFieldErrorKey) {
    setFieldErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  function showFieldError(
    field: VolunteerFieldErrorKey,
    message: string,
    focusId?: string
  ) {
    setError(null)
    const targetStep =
      field === "available_dates" || field === "available_time"
        ? 2
        : field === "safety_acknowledged" || field === "privacy_agreed" || field === "terms_agreed"
          ? 3
          : 1
    setStep(targetStep)
    setFieldErrors((current) => ({ ...current, [field]: message }))
    requestAnimationFrame(() => {
      const target = document.getElementById(
        focusId ?? (field === "available_time" ? "available_hour" : field)
      )
      target?.scrollIntoView({ behavior: "smooth", block: "center" })
      target?.focus({ preventScroll: true })
    })
  }

  function moveToStep(nextStep: number) {
    setError(null)
    setStep(nextStep)
    requestAnimationFrame(() => {
      stepAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }

  function handlePartyTypeChange(nextType: "individual" | "group") {
    setPartyType(nextType)
    setError(null)
    setFieldErrors({})
    if (nextType === "individual") {
      setHasMinor(false)
      setMinorGuardian(false)
    }
  }

  function handleDatesChange(dates: string[]) {
    setSelectedDates(dates)
    clearFieldError("available_dates")
    clearFieldError("available_time")
    const nextOptions = getVolunteerTimeOptions(dates)
    if (visitHour && !nextOptions.some((time) => time.startsWith(`${visitHour}:`))) {
      setVisitHour("")
      setVisitMinute("")
    } else if (visitTime && !nextOptions.includes(visitTime)) {
      setVisitMinute("")
    }
  }

  function handleNext() {
    setError(null)
    setFieldErrors({})
    if (step === 1) {
      const fd = new FormData(formRef.current!)
      if (partyType === "group") {
        const groupNameCheck = validateOrgOrPersonName(String(fd.get("group_name") ?? ""))
        if (!groupNameCheck.valid) {
          showFieldError("group_name", groupNameCheck.error!)
          return
        }
      }
      const nameCheck = validateName(String(fd.get("applicant_name") ?? ""))
      if (!nameCheck.valid) {
        showFieldError("applicant_name", nameCheck.error!)
        return
      }
      const phoneCheck = validateKoreanPhone(String(fd.get("phone") ?? ""))
      if (!phoneCheck.valid) {
        showFieldError("phone", phoneCheck.error!)
        return
      }
      if (partyType === "group") {
        const partySizeCheck = validateGroupPartySize(String(fd.get("party_size") ?? "1"))
        if (!partySizeCheck.valid) {
          showFieldError("party_size", partySizeCheck.error!)
          return
        }
      }
      if (partyType === "group" && hasMinor && !minorGuardian) {
        showFieldError("minor_guardian", "미성년자 참여 시 보호자 동의가 필요합니다.")
        return
      }
    }
    if (step === 2) {
      const scheduleError = validateVolunteerSchedule(selectedDates, visitTime)
      if (scheduleError) {
        const field = selectedDates.length === 0 ? "available_dates" : "available_time"
        showFieldError(field, scheduleError)
        return
      }
    }
    moveToStep(step + 1)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    const formData = new FormData(e.currentTarget)

    if (partyType === "group") {
      const groupNameCheck = validateOrgOrPersonName(String(formData.get("group_name") ?? ""))
      if (!groupNameCheck.valid) {
        return showFieldError("group_name", groupNameCheck.error!)
      }
    }
    const nameCheck = validateName(String(formData.get("applicant_name") ?? ""))
    if (!nameCheck.valid) return showFieldError("applicant_name", nameCheck.error!)
    const phoneCheck = validateKoreanPhone(String(formData.get("phone") ?? ""))
    if (!phoneCheck.valid) return showFieldError("phone", phoneCheck.error!)
    if (partyType === "group") {
      const partyCheck = validateGroupPartySize(String(formData.get("party_size") ?? "1"))
      if (!partyCheck.valid) return showFieldError("party_size", partyCheck.error!)
    }
    formData.set("party_type", partyType)

    const scheduleError = validateVolunteerSchedule(selectedDates, visitTime)
    if (scheduleError) {
      const field = selectedDates.length === 0 ? "available_dates" : "available_time"
      return showFieldError(field, scheduleError)
    }
    if (!safetyAcknowledged) {
      return showFieldError("safety_acknowledged", "안전 사항 인지 동의가 필요합니다.")
    }
    if (partyType === "group" && hasMinor && !minorGuardian) {
      return showFieldError("minor_guardian", "미성년자 참여 시 보호자 동의가 필요합니다.")
    }
    if (!privacyAgreed) {
      return showFieldError("privacy_agreed", "개인정보 수집·이용 동의가 필요합니다.")
    }
    if (!termsAgreed) return showFieldError("terms_agreed", "이용약관 동의가 필요합니다.")

    startTransition(async () => {
      const result = await submitVolunteerApplication(formData)
      if (result.error) {
        const field = result.field as VolunteerFieldErrorKey | undefined
        if (field) showFieldError(field, result.error)
        else setError(result.error)
      }
      else setSuccess(true)
    })
  }

  if (success) {
    const datesWithStaff = selectedDates.filter((d) => (staffByDate[d] ?? []).length > 0)
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

        {datesWithStaff.length > 0 && (
          <div className="mt-5 rounded-lg border border-border bg-card p-4 text-left">
            <p className="text-sm font-semibold text-foreground">📌 방문 안내</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              도착하시면 아래 운영진을 찾아주세요.
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {datesWithStaff.map((date) => {
                const list = staffByDate[date]
                const dt = new Date(date)
                const weekday = ["일", "월", "화", "수", "목", "금", "토"][dt.getDay()]
                return (
                  <li key={date}>
                    <p className="font-medium text-foreground">
                      {date.slice(5).replace("-", "/")} ({weekday})
                    </p>
                    <ul className="mt-0.5 space-y-0.5 pl-2">
                      {list.map((s, i) => {
                        const start = formatTime(s.start_time)
                        const end = formatTime(s.end_time)
                        const time = start && end ? `${start} ~ ${end}` : start ? `${start} ~` : "종일"
                        return (
                          <li key={i} className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">{s.user_nickname}</span>
                            <span className="ml-1.5">{time}</span>
                            {s.note && <span className="ml-1.5">— {s.note}</span>}
                          </li>
                        )
                      })}
                    </ul>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        <a
          href="/my/applications"
          className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
        >
          신청 내역 확인하기 →
        </a>
      </div>
    )
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-8">
      <VolunteerApplicationGuide />

      {/* Mobile step indicator */}
      <div
        ref={stepAnchorRef}
        className="scroll-mt-20 sm:hidden flex items-center justify-between border-b border-border bg-secondary/30 px-3 py-2.5 -mx-4 -mt-5 mb-5 rounded-t-xl"
      >
        <div className="flex items-center gap-2">
          {stepLabels.map((label, i) => {
            const n = i + 1
            const done = n < step
            const active = n === step
            return (
              <div key={n} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-border text-xs">›</span>}
                <span className={cn("flex size-5 items-center justify-center rounded-full text-[10px] font-bold",
                  done && "bg-primary/30 text-primary",
                  active && "bg-primary text-primary-foreground",
                  !done && !active && "bg-secondary text-muted-foreground"
                )}>
                  {done ? "✓" : n}
                </span>
                <span
                  aria-current={active ? "step" : undefined}
                  className={cn("text-[11px] font-medium", active ? "text-foreground" : "text-muted-foreground")}
                >
                  {label}
                </span>
              </div>
            )
          })}
        </div>
        <span className="text-[10px] text-muted-foreground">{step}/3</span>
      </div>

      {/* Step 1: 신청 종류 + 신청자 정보 */}
      <div className={step === 1 ? "contents" : "hidden sm:contents"}>
        {/* 1. 신청 종류 */}
        <Card title="신청 종류" required>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="신청 종류">
            <TypeOption
              active={partyType === "individual"}
              Icon={User}
              label="개인 신청"
              onClick={() => handlePartyTypeChange("individual")}
            />
            <TypeOption
              active={partyType === "group"}
              Icon={Users}
              label="단체 신청"
              desc="학교/기업/종교단체 등"
              onClick={() => handlePartyTypeChange("group")}
            />
          </div>
        </Card>

        {/* 2. 신청자 정보 */}
        <Card title={partyType === "group" ? "단체 정보" : "신청자 정보"} required>
          <div className="grid gap-4 md:grid-cols-2">
            {partyType === "group" && (
              <Field
                id="group_name"
                label="단체명"
                required
                className="md:col-span-2"
              >
                <Input
                  id="group_name"
                  name="group_name"
                  required
                  minLength={2}
                  maxLength={30}
                  pattern={ORG_OR_PERSON_PATTERN_RAW}
                  title={ORG_OR_PERSON_HINT}
                  placeholder="예: 왕왕대학교 봉사동아리"
                  aria-invalid={Boolean(fieldErrors.group_name)}
                  aria-describedby={fieldErrors.group_name ? "group_name-error" : "group_name-hint"}
                  onChange={() => clearFieldError("group_name")}
                />
                <p id="group_name-hint" className="text-xs text-muted-foreground">
                  {ORG_OR_PERSON_HINT}
                </p>
                <FieldError id="group_name-error" message={fieldErrors.group_name} />
              </Field>
            )}
            <Field
              id="applicant_name"
              label={partyType === "group" ? "인솔자 이름" : "이름"}
              required
            >
              <Input
                id="applicant_name"
                name="applicant_name"
                required
                minLength={2}
                maxLength={20}
                pattern={NAME_PATTERN_RAW}
                title={NAME_HINT}
                placeholder="홍길동"
                aria-invalid={Boolean(fieldErrors.applicant_name)}
                aria-describedby={fieldErrors.applicant_name ? "applicant_name-error" : "applicant_name-hint"}
                onChange={() => clearFieldError("applicant_name")}
              />
              <p id="applicant_name-hint" className="text-xs text-muted-foreground">
                {NAME_HINT}
              </p>
              <FieldError id="applicant_name-error" message={fieldErrors.applicant_name} />
            </Field>
            <Field id="phone" label={partyType === "group" ? "인솔자 연락처" : "연락처"} required>
              <PhoneInput
                key={partyType}
                id="phone"
                name="phone"
                required
                defaultValue={profilePhone}
                readOnly={partyType === "individual" && !!profilePhone}
                aria-invalid={Boolean(fieldErrors.phone)}
                aria-describedby={fieldErrors.phone ? "phone-error" : "phone-hint"}
                onValueChange={() => clearFieldError("phone")}
                className={partyType === "individual" && !!profilePhone ? "cursor-default bg-secondary/50" : ""}
              />
              {partyType === "individual" && profilePhone ? (
                <p id="phone-hint" className="text-xs text-muted-foreground">프로필에 등록된 번호입니다.</p>
              ) : (
                <p id="phone-hint" className="text-xs text-muted-foreground">{PHONE_HINT}</p>
              )}
              <FieldError id="phone-error" message={fieldErrors.phone} />
            </Field>
            {/* 인원수 — 단체일 때만 표시, 개인은 hidden으로 1 전송 */}
            {partyType === "group" ? (
              <Field id="party_size" label="인원수" required>
                <Input
                  id="party_size"
                  name="party_size"
                  type="number"
                  min={2}
                  max={30}
                  value={partySize}
                  onChange={(e) => {
                    setPartySize(e.target.value)
                    clearFieldError("party_size")
                  }}
                  required
                  aria-invalid={Boolean(fieldErrors.party_size)}
                  aria-describedby={fieldErrors.party_size ? "party_size-error" : "party_size-hint"}
                />
                <p id="party_size-hint" className="text-xs text-muted-foreground">
                  인솔자 포함, 최대 30명
                </p>
                <FieldError id="party_size-error" message={fieldErrors.party_size} />
                <LargeGroupInquiry className="mt-2" />
              </Field>
            ) : (
              <input type="hidden" name="party_size" value="1" />
            )}
            {partyType === "group" && (
              <CheckRow
                id="has_minor"
                checked={hasMinor}
                onChange={(checked) => {
                  setHasMinor(checked)
                  if (!checked) {
                    setMinorGuardian(false)
                    clearFieldError("minor_guardian")
                  }
                }}
                label="만 14세 미만이 포함됩니다"
                className="md:col-span-2"
              />
            )}
            {partyType === "group" && hasMinor && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 md:col-span-2 dark:border-amber-900/50 dark:bg-amber-900/20">
                <CheckRow
                  id="minor_guardian"
                  checked={minorGuardian}
                  onChange={(checked) => {
                    setMinorGuardian(checked)
                    clearFieldError("minor_guardian")
                  }}
                  label="미성년자 보호자(법정대리인 또는 학교·기관 담당자)의 동의·인솔 하에 참여합니다"
                  required
                  invalid={Boolean(fieldErrors.minor_guardian)}
                />
                <FieldError id="minor_guardian-error" message={fieldErrors.minor_guardian} />
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Step 2: 일정 + 자기소개 */}
      <div className={step === 2 ? "contents" : "hidden sm:contents"}>
        {/* 3. 일정·활동 */}
        <Card title="활동 일정 · 희망 활동">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">
              가능한 날짜 <span className="text-destructive">*</span>
            </Label>
            <DateMultiPicker
              id="available_dates"
              name="available_dates"
              onChange={handleDatesChange}
              invalid={Boolean(fieldErrors.available_dates)}
              disabledDates={blockedDates}
              disabledTitle={`정기봉사일 — ${groupBlockThreshold}명 이상 단체는 신청할 수 없어요.`}
            />
            <p className="text-[11px] text-muted-foreground/80">
              여러 날짜 선택 가능. 운영진이 확인 후 가능한 날짜로 일정을 조율합니다.
            </p>
            <FieldError id="available_dates-error" message={fieldErrors.available_dates} />
            {groupBlocking && blockedDates.length > 0 && (
              <p className="rounded-md bg-rose-50 px-3 py-2 text-[11px] font-medium leading-relaxed text-rose-700 dark:bg-rose-950/20 dark:text-rose-300">
                정기봉사가 있는 날(분홍색·취소선)은 {groupBlockThreshold}명 이상 단체 신청이
                어려워요. 다른 날짜를 골라주시거나 인원을 조정해 주세요.
              </p>
            )}

            {/* 선택된 날짜에 출근 예정인 운영진 안내 */}
            {selectedDates.length > 0 && (
              <div className="mt-3 space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs">
                <p className="font-semibold text-foreground">선택한 날짜의 운영진 출근 예정</p>
                <ul className="space-y-2">
                  {selectedDates.map((date) => {
                    const list = staffByDate[date] ?? []
                    const dt = new Date(date)
                    const weekday = ["일", "월", "화", "수", "목", "금", "토"][dt.getDay()]
                    return (
                      <li key={date}>
                        <p className="font-medium text-foreground">
                          {date.slice(5).replace("-", "/")} ({weekday})
                        </p>
                        {list.length === 0 ? (
                          <p className="mt-0.5 pl-2 text-muted-foreground">아직 출근 예정 운영진이 등록되지 않았어요</p>
                        ) : (
                          <ul className="mt-0.5 space-y-0.5 pl-2">
                            {list.map((s, i) => {
                              const start = formatTime(s.start_time)
                              const end = formatTime(s.end_time)
                              const time = start && end ? `${start} ~ ${end}` : start ? `${start} ~` : "종일"
                              return (
                                <li key={i} className="text-muted-foreground">
                                  <span className="font-medium text-foreground">{s.user_nickname}</span>
                                  <span className="ml-1.5">{time}</span>
                                  {s.note && <span className="ml-1.5">— {s.note}</span>}
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>

          <div className="mt-3">
            <VolunteerTimeField
              selectedDates={selectedDates}
              hour={visitHour}
              minute={visitMinute}
              onHourChange={(value) => {
                setVisitHour(value)
                clearFieldError("available_time")
              }}
              onMinuteChange={(value) => {
                setVisitMinute(value)
                clearFieldError("available_time")
              }}
              error={fieldErrors.available_time}
              required
            />
          </div>

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
      </div>

      {/* Step 3: 안전인지 + 동의 */}
      <div className={step === 3 ? "contents" : "hidden sm:contents"}>
        {/* 5. 안전 사항 인지 */}
        <Card title="안전 사항 인지" required>
          <p className="mb-2 text-xs leading-relaxed text-muted-foreground">
            보호동물·시설 환경 특성상 봉사 활동 중 일부 위험(물림, 스크래치,
            알레르기 등)이 수반될 수 있습니다.
          </p>
          <CheckRow
            id="safety_acknowledged"
            checked={safetyAcknowledged}
            onChange={(checked) => {
              setSafetyAcknowledged(checked)
              clearFieldError("safety_acknowledged")
            }}
            label="위 위험 가능성을 인지하고 단체의 안전 수칙을 준수하겠습니다"
            required
            invalid={Boolean(fieldErrors.safety_acknowledged)}
          />
          <FieldError id="safety_acknowledged-error" message={fieldErrors.safety_acknowledged} />
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
          onPrivacyChange={(checked) => {
            setPrivacyAgreed(checked)
            clearFieldError("privacy_agreed")
          }}
          termsAgreed={termsAgreed}
          onTermsChange={(checked) => {
            setTermsAgreed(checked)
            clearFieldError("terms_agreed")
          }}
          termsAlreadyAgreed={termsAlreadyAgreed}
          privacyError={fieldErrors.privacy_agreed}
          termsError={fieldErrors.terms_agreed}
        />
      </div>

      {/* Error: always visible on desktop; on mobile only shown on current step */}
      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {/* Mobile step navigation */}
      <div className="sm:hidden flex items-center justify-between gap-2">
        {step > 1 ? (
          <button type="button" onClick={() => moveToStep(step - 1)} className="flex min-h-11 items-center gap-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground">
            <ChevronLeft className="size-4" /> 이전
          </button>
        ) : (
          <button type="button" onClick={() => router.back()} className="min-h-11 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-muted-foreground">취소</button>
        )}
        {step < 3 ? (
          <button type="button" onClick={handleNext} className="min-h-11 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
            다음
          </button>
        ) : (
          <button type="submit" disabled={pending} className="min-h-11 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {pending ? "접수 중..." : "봉사 신청하기"}
          </button>
        )}
      </div>

      {/* Desktop: keep existing FormFooter */}
      <div className="hidden sm:block">
        <FormFooter
          pending={pending}
          submitLabel="봉사 신청하기"
          pendingLabel="접수 중..."
          onCancel={() => router.back()}
        />
      </div>
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
  id,
  checked,
  onChange,
  label,
  required,
  invalid,
  className,
}: {
  id?: string
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  required?: boolean
  invalid?: boolean
  className?: string
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-2 py-1 text-sm ${className ?? ""}`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-invalid={invalid}
        aria-describedby={invalid && id ? `${id}-error` : undefined}
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
      role="radio"
      aria-checked={active}
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

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className="text-xs font-medium leading-relaxed text-destructive" role="alert">
      {message}
    </p>
  )
}
