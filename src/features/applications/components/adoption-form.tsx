"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react"
import { submitAdoptionApplication } from "../api/mutations"
import { searchAdoptionAnimals, type AdoptionAnimal } from "../api/adoption-animals"
import { ConsentSection } from "@/features/legal"
import { AddressSearchInput } from "@/shared/components/address-search-input"
import { DateMultiPicker } from "@/shared/components/date-multi-picker"
import { PhoneInput } from "@/shared/components/phone-input"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Textarea } from "@/shared/components/ui/textarea"
import { NAME_HINT, NAME_PATTERN_RAW, validateKoreanPhone, validateName } from "@/shared/lib/validation"

interface Props {
  initialAnimal?: AdoptionAnimal | null
  profilePhone?: string
  termsAlreadyAgreed?: boolean
  unavailableAnimal?: boolean
}

const control = "min-h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-base focus-visible:outline-2 focus-visible:outline-ring"

export function AdoptionForm({ initialAnimal = null, profilePhone = "", termsAlreadyAgreed = false, unavailableAnimal = false }: Props) {
  const [animal, setAnimal] = useState(initialAnimal)
  const [mode, setMode] = useState("select")
  const [query, setQuery] = useState("")
  const [animals, setAnimals] = useState<AdoptionAnimal[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState("")
  const [ownership, setOwnership] = useState("")
  const [reason, setReason] = useState("")
  const [reasonTouched, setReasonTouched] = useState(false)
  const [dates, setDates] = useState<string[]>([])
  const [hour, setHour] = useState("")
  const [minute, setMinute] = useState("00")
  const [privacy, setPrivacy] = useState(false)
  const [terms, setTerms] = useState(termsAlreadyAgreed)
  const [error, setError] = useState<{ message: string; field?: string } | null>(null)
  const [pending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const submitting = useRef(false)
  const feedbackRef = useRef<HTMLDivElement>(null)
  const invalidReason = reasonTouched && reason.trim().length < 10

  useEffect(() => {
    if (mode !== "select" || animal || !query.trim()) return
    let active = true
    const timer = setTimeout(async () => {
      try {
        const result = await searchAdoptionAnimals(query)
        if (active) { setAnimals(result.animals); setSearchError(result.error ?? "") }
      } catch {
        if (active) { setAnimals([]); setSearchError("검색하지 못했습니다. 잠시 후 다시 시도해 주세요.") }
      } finally { if (active) setSearching(false) }
    }, 300)
    return () => { active = false; clearTimeout(timer) }
  }, [query, mode, animal])

  useEffect(() => {
    if (error || success) feedbackRef.current?.focus()
  }, [error, success])

  function fail(message: string, field?: string) { setError({ message, field }) }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    setError(null)
    const data = new FormData(event.currentTarget)
    if (mode === "select" && !animal) return fail("아이를 선택하거나 직접 입력 / 상담 후 결정을 선택해 주세요.", "animal_mode")
    if (mode === "manual" && !String(data.get("preferred_animal") ?? "").trim()) return fail("희망하는 아이의 이름이나 특징을 적어주세요.", "preferred_animal")
    const nameCheck = validateName(String(data.get("applicant_name") ?? ""))
    if (!nameCheck.valid) return fail(nameCheck.error!, "applicant_name")
    const phoneCheck = validateKoreanPhone(String(data.get("phone") ?? ""))
    if (!phoneCheck.valid) return fail(phoneCheck.error!, "phone")
    if (String(data.get("address") ?? "").trim().length < 5) return fail("주소 검색으로 거주지 주소를 입력해 주세요.", "address")
    setReasonTouched(true)
    if (reason.trim().length < 10) return fail("입양 이유를 10자 이상 작성해 주세요.", "reason")
    if (!event.currentTarget.reportValidity()) return
    if (!dates.length) return fail("희망 방문일을 하나 이상 선택해 주세요.", "visit-dates")
    submitting.current = true
    startTransition(async () => {
      try {
        const result = await submitAdoptionApplication(data)
        if (result.error) fail(result.error, result.field)
        else setSuccess(true)
      } catch {
        fail("접수 결과를 확인하지 못했습니다. 마이페이지의 신청 내역을 먼저 확인한 뒤 다시 시도해 주세요.")
      } finally { submitting.current = false }
    })
  }

  if (success) return <div ref={feedbackRef} tabIndex={-1} role="status" className="rounded-2xl border border-border bg-card p-8 text-center focus-visible:outline-ring">
    <h2 className="text-xl font-semibold">입양 신청이 접수되었습니다</h2>
    <p className="mt-3 text-sm leading-6 text-muted-foreground">운영진이 확인한 후 등록하신 연락처로 안내드립니다.<br />방문 일정은 상담 후 확정됩니다.</p>
    <Link href="/my/applications" className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground">신청 내역 확인하기</Link>
  </div>

  return <form onSubmit={handleSubmit} noValidate className="rounded-2xl border border-border bg-card p-5 sm:p-8">
    {error && <div ref={feedbackRef} tabIndex={-1} role="alert" className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive focus-visible:outline-ring">
      {error.field ? <a href={`#${error.field}`} className="underline">{error.message}</a> : error.message}
    </div>}
    <fieldset disabled={pending} className="min-w-0 space-y-8 disabled:opacity-70">
      <Section title="함께하고 싶은 아이">
        {unavailableAnimal && !animal && <p className="mb-3 text-sm text-muted-foreground">기존에 선택한 아이는 현재 신청할 수 없습니다. 다른 아이를 선택하거나 상담 후 결정을 선택해 주세요.</p>}
        <div id="animal_mode" tabIndex={-1} className="scroll-mt-24">
          <input type="hidden" name="animal_mode" value={mode} />
          <input type="hidden" name="dog_id" value={mode === "select" && animal?.kind === "dog" ? animal.id : ""} />
          <input type="hidden" name="cat_id" value={mode === "select" && animal?.kind === "cat" ? animal.id : ""} />
          {animal && mode === "select" ? <div className="flex flex-wrap items-center gap-4 rounded-xl bg-secondary/40 p-4">
            <AnimalPhoto animal={animal} />
            <div className="min-w-0 flex-1"><p className="break-words text-lg font-semibold">{animal.name}</p><p className="mt-1 text-xs text-muted-foreground">입양을 신청할 {animal.kind === "dog" ? "강아지" : "고양이"}</p></div>
            <button type="button" onClick={() => { setAnimal(null); setQuery(""); setAnimals([]); setSearching(false) }} className="min-h-11 text-sm text-primary underline underline-offset-4">다른 아이 선택</button>
          </div> : <>
            <fieldset><legend className="sr-only">희망하는 아이 선택 방법</legend><div className="flex flex-wrap gap-2">
              {[["select", "아이 선택"], ["manual", "직접 입력"], ["consult", "상담 후 결정"]].map(([value, label]) => <label key={value} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm ${mode === value ? "border-primary bg-primary/5" : "border-border"}`}>
                <input type="radio" name="animal-choice" value={value} checked={mode === value} onChange={() => { setMode(value); setQuery(""); setAnimals([]); setSearchError(""); setSearching(false) }} className="size-4 accent-primary" />{label}
              </label>)}
            </div></fieldset>
            {mode === "select" && <div className="mt-4">
              <Field id="animal-search" label="아이 이름 검색"><Input id="animal-search" className={control} value={query} maxLength={60} onChange={e => { setQuery(e.target.value); setAnimals([]); setSearchError(""); setSearching(Boolean(e.target.value.trim())) }} placeholder="아이 이름을 입력해 주세요" autoComplete="off" /></Field>
              <div aria-live="polite" className="mt-2 text-sm text-muted-foreground">{searching ? "검색 중입니다…" : searchError || (query.trim() && !animals.length ? "찾는 아이가 없다면 직접 입력을 선택해 주세요." : "")}</div>
              {animals.length > 0 && <ul className="mt-3 grid gap-2 sm:grid-cols-2">{animals.map(item => <li key={`${item.kind}-${item.id}`}><button type="button" onClick={() => setAnimal(item)} className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:border-primary hover:bg-secondary/40 focus-visible:outline-2 focus-visible:outline-ring"><AnimalPhoto animal={item} small /><span className="min-w-0 break-words text-sm">{item.name}<span className="block text-xs text-muted-foreground">{item.kind === "dog" ? "강아지" : "고양이"}</span></span></button></li>)}</ul>}
            </div>}
            {mode === "manual" && <div className="mt-4"><Field id="preferred_animal" label="희망하는 아이" required><Input id="preferred_animal" name="preferred_animal" required maxLength={300} className={control} placeholder="이름이나 기억나는 특징을 적어주세요" /></Field><p className="mt-2 text-xs leading-5 text-muted-foreground">직접 입력한 내용은 상담 시 운영진이 확인합니다.</p></div>}
            {mode === "consult" && <p className="mt-4 rounded-lg bg-secondary/40 p-4 text-sm leading-6 text-muted-foreground">아직 정하지 않으셔도 괜찮습니다. 상담하며 함께 찾아보겠습니다.</p>}
          </>}
        </div>
      </Section>
      <Section title="신청자 정보"><div className="grid gap-5 sm:grid-cols-2">
        <Field id="applicant_name" label="이름" required><Input id="applicant_name" name="applicant_name" required minLength={2} maxLength={20} pattern={NAME_PATTERN_RAW} title={NAME_HINT} autoComplete="name" placeholder="이름을 입력해 주세요" className={control} /></Field>
        <Field id="phone" label="연락처" required><PhoneInput id="phone" name="phone" required defaultValue={profilePhone} autoComplete="tel" className="min-h-11 text-base md:text-base" /></Field>
        <div className="sm:col-span-2 [&_input]:min-h-11 [&_input]:text-base [&_button]:min-h-11"><Field id="address" label="거주지 주소" required><AddressSearchInput id="address" name="address" required /></Field></div>
      </div></Section>
      <Section title="함께할 환경"><div className="grid gap-5 sm:grid-cols-2">
        <Field id="family_size" label="가족 수 · 본인 포함" required><Input id="family_size" name="family_size" type="number" min={1} step={1} defaultValue={1} required className={control} /></Field>
        <Field id="has_children" label="어린이 동거 여부" required><select id="has_children" name="has_children" required defaultValue="" className={control}><option value="">선택해 주세요</option><option value="false">없음</option><option value="true">있음</option></select></Field>
        <Field id="housing_type" label="주거 형태" required><select id="housing_type" name="housing_type" required defaultValue="" className={control}><option value="">선택해 주세요</option>{["아파트", "주택", "빌라", "오피스텔", "기타"].map(value => <option key={value}>{value}</option>)}</select></Field>
        <Field id="ownership_type" label="소유 형태" required><select id="ownership_type" name="ownership_type" required value={ownership} onChange={e => setOwnership(e.target.value)} className={control}><option value="">선택해 주세요</option>{["자가", "전세", "월세"].map(value => <option key={value}>{value}</option>)}</select></Field>
      </div>
        {["전세", "월세"].includes(ownership) && <div className="mt-4 rounded-lg bg-secondary/40 px-4"><Check name="landlord_consent">임대인의 반려동물 양육 동의를 받았습니다.</Check></div>}
        <Experience name="current_pets" label="현재 함께하는 반려동물" hint="종류, 마릿수, 나이, 성격 등을 적어주세요." />
        <Experience name="past_pet_experience" label="과거 반려동물 양육 경험" hint="양육 기간과 현재 함께하지 않는 이유 등을 적어주세요." />
      </Section>
      <Section title="입양을 생각하신 이유"><Field id="reason" label="아이를 맞이하고 싶은 이유와 함께할 생활" required>
        <Textarea id="reason" name="reason" required minLength={10} rows={5} value={reason} onChange={e => setReason(e.target.value)} onBlur={() => setReasonTouched(true)} aria-invalid={invalidReason} aria-describedby="reason-hint reason-error" placeholder="아이를 가족으로 맞이하고 싶은 이유와 함께할 생활을 적어주세요. (10자 이상)" className="min-h-32 text-base md:text-base" />
        <div id="reason-hint" className="flex justify-between gap-3 text-xs text-muted-foreground"><span>10자 이상 작성해 주세요.</span><span>{reason.trim().length}자</span></div>
        <p id="reason-error" className="text-xs text-destructive" role={invalidReason ? "alert" : undefined}>{invalidReason ? "입양 이유를 10자 이상 작성해 주세요." : ""}</p>
      </Field></Section>
      <Section title="희망 방문 일정"><p className="mb-5 text-sm leading-6 text-muted-foreground">가능한 날짜를 선택해 주세요. 방문 일정은 상담 후 확정됩니다.</p><div className="grid items-start gap-5 sm:grid-cols-[minmax(0,1fr)_180px]">
        <div id="visit-dates" tabIndex={-1} className="min-w-0 scroll-mt-24"><p className="mb-2 text-sm font-medium">희망 방문일<Required /></p><DateMultiPicker name="visit_available_dates" onChange={setDates} /><p className="mt-2 text-xs text-muted-foreground">여러 날짜를 선택할 수 있습니다.</p></div>
        <Field id="visit_hour" label="희망 시간" required><div className="flex gap-2"><select id="visit_hour" required aria-label="희망 방문 시" value={hour} onChange={e => setHour(e.target.value)} className={control}><option value="">시</option>{[10, 11, 13, 14, 15, 16, 17].map(value => <option key={value} value={value}>{value}시</option>)}</select><select aria-label="희망 방문 분" value={minute} onChange={e => setMinute(e.target.value)} disabled={!hour} className={control}>{["00", "10", "20", "30", "40", "50"].map(value => <option key={value} value={value}>{value}분</option>)}</select></div><input type="hidden" name="visit_available_time" value={hour ? `${hour}:${minute}` : ""} /></Field>
      </div></Section>
      <Section title="신청 전 확인"><p className="mb-3 rounded-lg bg-secondary/40 p-4 text-sm leading-6 text-muted-foreground">입양 신청은 확정이 아닙니다. 상담과 만남을 통해 아이와 가족에게 맞는 결정을 함께합니다.</p>
        <Check name="adult">만 19세 이상의 성인이며, 직접 입양을 신청합니다.</Check>
        <Check name="family_consent">동거 가족 전원이 입양에 동의했습니다.</Check>
        <Check name="readiness">아이의 평생을 책임질 경제적·시간적 준비가 되어 있습니다.</Check>
        <ConsentSection compact privacy={{ purpose: "입양 상담 및 사후 모니터링", items: "이름, 연락처, 주소, 희망하는 아이, 가족·주거 정보, 반려 경험, 방문 일정, 입양 이유", retention: "입양 완료 또는 상담 종료 후 1년" }} privacyAgreed={privacy} onPrivacyChange={setPrivacy} termsAgreed={terms} onTermsChange={setTerms} termsAlreadyAgreed={termsAlreadyAgreed} />
      </Section>
      <div><button type="submit" disabled={pending} className="min-h-12 w-full rounded-lg bg-primary px-5 py-3 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-wait">{pending ? "접수 중…" : "입양 신청하기"}</button><p className="mt-3 text-center text-xs leading-5 text-muted-foreground">신청 내용을 확인한 후 등록하신 연락처로 안내드립니다.</p></div>
    </fieldset>
  </form>
}

function Required() { return <span className="ml-1.5 text-xs font-medium text-primary">필수</span> }
function Section({ title, children }: { title: string; children: ReactNode }) { return <section className="min-w-0 border-t border-border pt-7 first:border-0 first:pt-0"><h2 className="mb-5 text-lg font-semibold">{title}</h2>{children}</section> }
function Field({ id, label, required, children }: { id: string; label: string; required?: boolean; children: ReactNode }) { return <div className="min-w-0 space-y-2"><Label htmlFor={id}>{label}{required && <Required />}</Label>{children}</div> }
function Check({ name, children }: { name: string; children: ReactNode }) { return <label className="flex min-h-11 cursor-pointer items-start gap-2.5 py-3 text-sm leading-6"><input id={name} name={name} type="checkbox" required className="mt-1 size-[18px] shrink-0 accent-primary" /><span>{children}<Required /></span></label> }
function AnimalPhoto({ animal, small = false }: { animal: AdoptionAnimal; small?: boolean }) { return <div className={`relative shrink-0 overflow-hidden rounded-lg bg-secondary ${small ? "size-12" : "size-20"}`}>{animal.image ? <Image src={animal.image} alt={animal.name} fill sizes={small ? "48px" : "80px"} className="object-cover" /> : <span className="flex h-full items-center justify-center text-xs text-muted-foreground">사진 준비 중</span>}</div> }
function Experience({ name, label, hint }: { name: string; label: string; hint: string }) {
  const [value, setValue] = useState("")
  return <fieldset className="mt-6"><legend className="text-sm font-medium">{label}<Required /></legend><div className="mt-3 flex gap-2">{[["no", "없음"], ["yes", "있음"]].map(([key, text]) => <label key={key} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-4 text-sm ${value === key ? "border-primary bg-primary/5" : "border-border"}`}><input type="radio" name={`${name}_choice`} required checked={value === key} onChange={() => setValue(key)} value={key} className="size-4 accent-primary" />{text}</label>)}</div>{value === "no" && <input type="hidden" name={name} value="없음" />}{value === "yes" && <div className="mt-3"><Field id={name} label={`${label} 상세`} required><Textarea id={name} name={name} required rows={3} placeholder={hint} className="text-base md:text-base" /></Field></div>}</fieldset>
}
