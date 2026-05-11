"use client"

import { useRouter } from "next/navigation"
import React, { useRef, useState, useTransition } from "react"
import { ChevronLeft, User, Users } from "lucide-react"

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
import { cn } from "@/shared/lib/utils"
import type { VolunteerActivity } from "@/shared/types/database"

const ACTIVITIES: VolunteerActivity[] = [
  "산책",
  "목욕·미용",
  "청소·정리",
  "홍보·촬영",
]

const stepLabels = ["신청자 정보", "활동 일정", "동의 및 제출"]

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
}

function formatTime(t: string | null): string | null {
  if (!t) return null
  return t.slice(0, 5)
}

export function VolunteerForm({ termsAlreadyAgreed = false, staffByDate = {} }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [step, setStep] = useState(1)
  const formRef = useRef<HTMLFormElement>(null)

  const [visitHour, setVisitHour] = useState("")
  const [visitMinute, setVisitMinute] = useState("00")
  const visitTime = visitHour ? `${visitHour}:${visitMinute}` : ""

  const [partyType, setPartyType] = useState<"individual" | "group">("individual")
  const [hasMinor, setHasMinor] = useState(false)
  const [minorGuardian, setMinorGuardian] = useState(false)
  const [safetyAcknowledged, setSafetyAcknowledged] = useState(false)
  const [privacyAgreed, setPrivacyAgreed] = useState(false)
  const [termsAgreed, setTermsAgreed] = useState(termsAlreadyAgreed)
  const [selectedDates, setSelectedDates] = useState<string[]>([])

  function handleNext() {
    setError(null)
    if (step === 1) {
      const fd = new FormData(formRef.current!)
      const nameCheck = partyType === "group" ? validateOrgOrPersonName(String(fd.get("applicant_name") ?? "")) : validateName(String(fd.get("applicant_name") ?? ""))
      if (!nameCheck.valid) { setError(nameCheck.error!); return }
      const phoneCheck = validateKoreanPhone(String(fd.get("phone") ?? ""))
      if (!phoneCheck.valid) { setError(phoneCheck.error!); return }
      const partySizeCheck = validatePartySize(String(fd.get("party_size") ?? "1"))
      if (!partySizeCheck.valid) { setError(partySizeCheck.error!); return }
      if (hasMinor && !minorGuardian) { setError("미성년자 참여 시 보호자 동의가 필요합니다."); return }
    }
    if (step === 2) {
      if (!visitTime) { setError("방문 예정 시간을 선택해주세요."); return }
    }
    setStep(s => s + 1)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

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
      {/* Mobile step indicator */}
      <div className="sm:hidden flex items-center justify-between border-b border-border bg-secondary/30 px-4 py-2.5 -mx-5 -mt-5 mb-5 rounded-t-xl">
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
                <span className={cn("text-[11px] font-medium", active ? "text-foreground" : "text-muted-foreground")}>
                  {label}
                </span>
              </div>
            )
          })}
        </div>
        <span className="text-[10px] text-muted-foreground">{step}/3</span>
      </div>

      {/* 안내 — 모든 스텝에서 노출 */}
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700/50 dark:bg-amber-950/20">
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">신청 전 안내</p>
        <p className="mt-2 text-xs leading-relaxed text-amber-900/90 dark:text-amber-300/90">
          현재는 승인 처리가 되어도 별도로 알림을 보내드리지 못하는 상황입니다.
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-amber-900/90 dark:text-amber-300/90">
          곧 <span className="font-semibold">카카오톡 알림 서비스</span>를 통해 신청 결과를 받아보실 수 있도록 준비 중이에요.
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-amber-900/90 dark:text-amber-300/90">
          신청 후 <span className="font-semibold">1시간 이내</span>에 승인 처리하려 노력하고 있으니,
          번거로우시더라도 신청 후 <span className="font-semibold">마이페이지</span>에서 승인 상태와 안내사항을 확인해 주세요.
        </p>
      </div>

      {/* Step 1: 신청 종류 + 신청자 정보 */}
      <div className={step === 1 ? "contents" : "hidden sm:contents"}>
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
      </div>

      {/* Step 2: 일정 + 자기소개 */}
      <div className={step === 2 ? "contents" : "hidden sm:contents"}>
        {/* 3. 일정·활동 */}
        <Card title="활동 일정 · 희망 활동">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">
              가능한 날짜
            </Label>
            <DateMultiPicker name="available_dates" onChange={setSelectedDates} />
            <p className="text-[11px] text-muted-foreground/80">
              여러 날짜 선택 가능. 운영진이 확인 후 가능한 날짜로 일정을 조율합니다.
            </p>

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

          <Field id="available_time" label="방문 예정 시간" required className="mt-3">
            <div className="flex items-center gap-1.5">
              <select
                value={visitHour}
                onChange={(e) => setVisitHour(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">시</option>
                {Array.from({ length: 10 }, (_, i) => {
                  const h = String(i + 9).padStart(2, "0")
                  return <option key={h} value={h}>{i + 9}시</option>
                })}
              </select>
              <select
                value={visitMinute}
                onChange={(e) => setVisitMinute(e.target.value)}
                disabled={!visitHour}
                className="h-10 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-40"
              >
                {["00", "10", "20", "30", "40", "50"].map((m) => (
                  <option key={m} value={m}>{m}분</option>
                ))}
              </select>
            </div>
            <input type="hidden" name="available_time" value={visitTime} />
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
      </div>

      {/* Error: always visible on desktop; on mobile only shown on current step */}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {/* Mobile step navigation */}
      <div className="sm:hidden flex items-center justify-between gap-2">
        {step > 1 ? (
          <button type="button" onClick={() => { setError(null); setStep(s => s - 1) }} className="flex items-center gap-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground">
            <ChevronLeft className="size-4" /> 이전
          </button>
        ) : (
          <button type="button" onClick={() => router.back()} className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-muted-foreground">취소</button>
        )}
        {step < 3 ? (
          <button type="button" onClick={handleNext} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
            다음
          </button>
        ) : (
          <button type="submit" disabled={pending} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
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
