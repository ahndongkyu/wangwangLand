"use client"

import React, { useRef, useState, useTransition } from "react"

import { submitVolunteerApplication } from "../api/mutations"
import {
  getVolunteerTimeOptions,
  validateVolunteerSchedule,
} from "../lib/volunteer-operating-hours"
import { normalizeVolunteerGroupName } from "../lib/volunteer-applicant"
import { VolunteerTimeField } from "./volunteer-time-field"
import { VolunteerPreparationGuide } from "./volunteer-preparation-guide"
import { SITE } from "@/shared/constants/site"
import { ConsentSection } from "@/features/legal"
import { DateMultiPicker } from "@/shared/components/date-multi-picker"
import { PhoneInput } from "@/shared/components/phone-input"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Textarea } from "@/shared/components/ui/textarea"
import {
  NAME_HINT,
  NAME_PATTERN_RAW,
  PHONE_HINT,
  validateGroupPartySize,
  validateKoreanPhone,
  validateName,
  validateOrgOrPersonName,
} from "@/shared/lib/validation"
import { cn } from "@/shared/lib/utils"
type VolunteerFieldErrorKey =
  | "group_name"
  | "applicant_name"
  | "phone"
  | "party_size"
  | "minor_guardian"
  | "available_dates"
  | "available_time"
  | "preparation_acknowledged"
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
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<VolunteerFieldErrors>({})
  const [success, setSuccess] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const submittingRef = useRef(false)
  const [preparationAcknowledged, setPreparationAcknowledged] = useState(false)

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
    setFieldErrors((current) => ({ ...current, [field]: message }))
    requestAnimationFrame(() => {
      const target = document.getElementById(
        focusId ?? (field === "available_time" ? "available_hour" : field)
      )
      target?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" })
      target?.focus({ preventScroll: true })
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (submittingRef.current) return
    setError(null)
    setFieldErrors({})

    const formData = new FormData(e.currentTarget)

    if (partyType === "group") {
      const groupName = normalizeVolunteerGroupName(
        String(formData.get("group_name") ?? "")
      )
      if (groupName) {
        const groupNameCheck = validateOrgOrPersonName(groupName)
        if (!groupNameCheck.valid) {
          return showFieldError("group_name", groupNameCheck.error!)
        }
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
    if (!preparationAcknowledged) {
      return showFieldError("preparation_acknowledged", "준비물과 방문 안내를 확인해 주세요.")
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

    submittingRef.current = true
    startTransition(async () => {
      try {
        const result = await submitVolunteerApplication(formData)
        if (result.error) {
          const field = result.field as VolunteerFieldErrorKey | undefined
          if (field) showFieldError(field, result.error)
          else setError(result.error)
        } else setSuccess(true)
      } catch {
        setError("접수 결과를 확인하지 못했습니다. 신청 내역을 먼저 확인한 뒤 다시 시도해 주세요.")
      } finally {
        submittingRef.current = false
      }
    })
  }

  if (success) {
    const datesWithStaff = selectedDates.filter((d) => (staffByDate[d] ?? []).length > 0)
    return (
      <div className="rounded-lg border border-primary bg-primary/5 p-8 text-center">
        <p className="mb-3 text-sm font-semibold text-primary">접수 완료 · 승인 대기</p>
        <h2 className="text-xl font-bold text-foreground">
          봉사 신청이 접수되었습니다
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          운영진이 확인 후 입력하신 연락처로 안내드리겠습니다.
          <br />
          승인 안내를 받으신 뒤 방문해 주세요.
        </p>

        {datesWithStaff.length > 0 && (
          <div className="mt-5 rounded-lg border border-border bg-card p-4 text-left">
            <p className="text-sm font-semibold text-foreground">방문 예정 운영진</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              선택하신 날짜의 출근 예정이며, 승인된 방문 일정을 확인해 주세요.
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
    <form ref={formRef} onSubmit={handleSubmit} noValidate aria-busy={pending}
      className="rounded-2xl border border-border bg-card p-4 sm:p-7">
      <fieldset disabled={pending} className="min-w-0 space-y-7 disabled:opacity-70">
        <section>
          <div className="mb-5 flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold">신청자 정보</h2>
            <span className="text-xs text-muted-foreground">* 필수 입력</span>
          </div>
          <div className="mb-5 grid grid-cols-2 gap-3" role="radiogroup" aria-label="신청 종류">
            <TypeOption active={partyType === "individual"} label="개인" desc="혼자 참여해요" onClick={() => handlePartyTypeChange("individual")} />
            <TypeOption active={partyType === "group"} label="단체" desc="2명 이상 함께해요" onClick={() => handlePartyTypeChange("group")} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              id="applicant_name"
              label={partyType === "group" ? "인솔자 이름" : "이름"}
              required
            >
              <Input
                  className="min-h-11 text-base md:text-base"
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
                className={cn("min-h-11 text-base md:text-base", partyType === "individual" && !!profilePhone && "cursor-default bg-muted/50")}
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
                  className="min-h-11 text-base md:text-base"
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
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">31명 이상은 <a href={SITE.sns.kakaoChannel} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-4">카카오톡으로 문의해 주세요.</a></p>
              </Field>
            ) : (
              <input type="hidden" name="party_size" value="1" />
            )}
            {partyType === "group" && (
              <Field
                id="group_name"
                label="단체명 (선택)"
              >
                <Input
                  className="min-h-11 text-base md:text-base"
                  id="group_name"
                  name="group_name"
                  maxLength={30}
                  placeholder="예: 왕왕대학교 봉사동아리"
                  aria-invalid={Boolean(fieldErrors.group_name)}
                  aria-describedby={fieldErrors.group_name ? "group_name-error" : "group_name-hint"}
                  onChange={() => clearFieldError("group_name")}
                />
                <p id="group_name-hint" className="text-xs text-muted-foreground">
                  단체명이 없으면 비워두세요.
                </p>
                <FieldError id="group_name-error" message={fieldErrors.group_name} />
              </Field>
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
              <div className="rounded-lg bg-muted/50 p-3 md:col-span-2">
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
        </section>
        <section className="border-t border-border pt-7">
          <h2 className="mb-5 text-lg font-semibold">언제 방문하시나요?</h2>
          <div className="grid items-start gap-5 md:grid-cols-[1.15fr_1fr]">
            <div className="min-w-0 space-y-2">
              <p className="text-sm font-medium">가능한 날짜 <span className="text-destructive">*</span></p>
              <DateMultiPicker id="available_dates" name="available_dates" onChange={handleDatesChange}
                invalid={Boolean(fieldErrors.available_dates)} disabledDates={blockedDates}
                disabledTitle={`정기봉사일 — ${groupBlockThreshold}명 이상 단체는 신청할 수 없어요.`} />
              <p className="text-xs leading-relaxed text-muted-foreground">가능한 날짜를 여러 개 선택할 수 있어요.<br />운영진이 확인 후 방문 일정을 조율합니다.</p>
              <FieldError id="available_dates-error" message={fieldErrors.available_dates} />
              {groupBlocking && blockedDates.length > 0 && (
                <p className="rounded-lg bg-muted p-3 text-xs leading-relaxed text-foreground">
                  취소선으로 표시된 정기봉사일에는 {groupBlockThreshold}명 이상 단체 신청이 어렵습니다. 다른 날짜를 선택해 주세요.
                </p>
              )}
            </div>
            <div className="min-w-0 space-y-3">
              <VolunteerTimeField selectedDates={selectedDates} hour={visitHour} minute={visitMinute}
                onHourChange={(value) => { setVisitHour(value); clearFieldError("available_time") }}
                onMinuteChange={(value) => { setVisitMinute(value); clearFieldError("available_time") }}
                error={fieldErrors.available_time} required />
              <p className="text-xs leading-relaxed text-muted-foreground">12:00~13:00는 점심시간으로 현장 안내가 어렵습니다.</p>
            </div>
          </div>
            {/* 선택된 날짜에 출근 예정인 운영진 안내 */}
            {selectedDates.length > 0 && (
              <details className="mt-4 text-xs">
                <summary className="min-h-11 cursor-pointer content-center text-sm text-muted-foreground">선택한 날짜의 운영진 출근 예정</summary>
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
              </details>
            )}
          <details className="mt-4">
            <summary className="min-h-11 cursor-pointer content-center text-sm text-muted-foreground">전달할 내용이 있나요? (선택)</summary>
            <Field id="message" label="메모">
              <Textarea id="message" name="message" rows={3} className="text-base" placeholder="궁금한 점이나 요청사항을 적어주세요." />
            </Field>
          </details>
        </section>
        <section className="border-t border-border pt-7">
          <h2 className="mb-5 text-lg font-semibold">방문 전에 확인해 주세요</h2>
          <VolunteerPreparationGuide />
          <CheckRow id="preparation_acknowledged" checked={preparationAcknowledged}
            onChange={(checked) => { setPreparationAcknowledged(checked); clearFieldError("preparation_acknowledged") }}
            label="준비물과 방문 안내를 확인했습니다." required invalid={Boolean(fieldErrors.preparation_acknowledged)} />
          <FieldError id="preparation_acknowledged-error" message={fieldErrors.preparation_acknowledged} />
          <div className="py-4 text-xs leading-relaxed text-muted-foreground">
            <p className="mb-1 text-sm font-medium text-foreground">쓰레기봉투 후원은 선택이에요</p>
            가능하시다면 청소용 100L 쓰레기봉투 한 장도 도움이 됩니다. 필수 준비물이 아니니 부담 없이 마음이 닿을 때만 함께해 주세요.
          </div>
          <div className="border-t border-border pt-4">
            <p className="mb-1 text-xs leading-relaxed text-muted-foreground">활동 중 물림·스크래치·알레르기 등의 위험이 있을 수 있습니다.</p>
            <CheckRow id="safety_acknowledged" checked={safetyAcknowledged}
              onChange={(checked) => { setSafetyAcknowledged(checked); clearFieldError("safety_acknowledged") }}
              label="위험 가능성을 이해하고 안전수칙을 준수하겠습니다." required invalid={Boolean(fieldErrors.safety_acknowledged)} />
            <FieldError id="safety_acknowledged-error" message={fieldErrors.safety_acknowledged} />
        <ConsentSection
          compact
          privacy={{
            purpose: "봉사 활동 운영 및 안전 관리, 출입 기록 관리",
            items:
              partyType === "group"
                ? "인솔자 이름·연락처, 동행 인원수, 활동 일정, 단체명(선택)"
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
        </section>
        <div className="border-t border-border pt-5">
          <div className="mb-4 flex flex-wrap justify-between gap-2 text-sm" aria-live="polite">
            <span>{partyType === "group" ? `단체 ${partySize || "—"}명` : "개인 1명"} · {selectedDates.length ? `${selectedDates.length}개 날짜 선택` : "날짜 미선택"}</span>
            <span>{visitTime || "시간 미선택"}</span>
          </div>
          {error && <p className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">{error}</p>}
          <button type="submit" disabled={pending} className="min-h-12 w-full rounded-xl bg-primary px-4 py-3 text-base font-semibold text-primary-foreground transition-colors hover:bg-brand-action-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring disabled:opacity-50">
            {pending ? "접수 중..." : "봉사 신청하기"}
          </button>
        </div>
      </fieldset>
    </form>
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
      className={`flex min-h-11 cursor-pointer items-start gap-2.5 py-3 text-sm ${className ?? ""}`}
    >
      <input
        id={id}
        name={id}
        required={required}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-invalid={invalid}
        aria-describedby={invalid && id ? `${id}-error` : undefined}
        className="mt-0.5 size-[18px] shrink-0 accent-primary"
      />
      <span className="flex-1 leading-relaxed text-foreground">
        {required && (
          <span className="mr-1 text-xs font-semibold text-primary">
            필수
          </span>
        )}
        {label}
      </span>
    </label>
  )
}

function TypeOption({ active, label, desc, onClick }: {
  active: boolean
  label: string
  desc: string
  onClick: () => void
}) {
  return (
    <label className={cn("flex min-h-16 cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-3 text-sm", active ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50")}>
      <input type="radio" name="party_type" value={label === "개인" ? "individual" : "group"} checked={active} onChange={onClick} className="size-4 shrink-0 accent-primary" />
      <span className="min-w-0"><span className="font-semibold">{label}</span><span className="mt-1 block text-xs text-muted-foreground">{desc}</span></span>
    </label>
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
