"use client"

import Link from "next/link"
import { useState, type ReactNode } from "react"
import { AnimalImageUploader } from "@/shared/components/animal-image-uploader"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Textarea } from "@/shared/components/ui/textarea"
import { ageMonthsFromBirthDate, formatAgeMonths } from "@/shared/lib/age"
import { useSaveFeedback } from "@/shared/lib/use-save-feedback"
import type { Cat, Dog } from "@/shared/types/database"
import { ANIMAL_GENDERS, ANIMAL_SIZES, ANIMAL_STATUSES, type AnimalKind } from "../lib/admin-filters"

const selectClass = "min-h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 text-base focus-visible:outline-2 focus-visible:outline-ring md:text-sm dark:bg-input/30 [&_option]:bg-card [&_option]:text-foreground"

export function AnimalForm({ kind, animal, onSave }: {
  kind: AnimalKind; animal?: Dog | Cat; onSave: (data: FormData) => Promise<{ error?: string; redirectTo?: string }>
}) {
  const [error, setError] = useState<string | null>(null)
  const [birthDate, setBirthDate] = useState(animal?.birth_date ?? "")
  const [photoBusy, setPhotoBusy] = useState(false)
  const { save, pending, completed } = useSaveFeedback(setError)
  const age = birthDate ? formatAgeMonths(ageMonthsFromBirthDate(birthDate)) : null
  const neutered = animal?.neutered === true ? "true" : animal?.neutered === false ? "false" : ""
  const listHref = `/admin/${kind}`

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (photoBusy || pending) return
    const data = new FormData(event.currentTarget)
    await save(() => onSave(data), "아이 정보가 저장되었습니다.", listHref)
  }

  if (completed) return <p role="status">저장되었습니다. 목록으로 이동합니다.</p>

  return <form onSubmit={handleSubmit} className="space-y-5 pb-5 [&_input]:min-h-11 [&_input]:rounded-lg [&_input]:text-base [&_textarea]:text-base [&_input]:scroll-mb-64 [&_select]:scroll-mb-64 [&_textarea]:scroll-mb-64 md:[&_input]:text-sm md:[&_textarea]:text-sm">
    <fieldset disabled={pending} className="grid min-w-0 gap-5 xl:grid-cols-[minmax(240px,0.8fr)_minmax(0,1.6fr)]">
      <div className="min-w-0">
        <Section title="사진" hint="최대 5장">
          <AnimalImageUploader folder={kind} initialImages={animal?.images ?? []} initialThumbnailIndex={animal?.thumbnail_index ?? 0} onBusyChange={setPhotoBusy} disabled={pending} />
        </Section>
        <p className="mt-4 px-1 text-xs leading-6 text-muted-foreground">홈 화면에 노출할 아이와 순서는 <Link href="/admin/settings" className="text-primary underline underline-offset-4">홈페이지 관리</Link>에서 설정합니다.</p>
      </div>
      <div className="min-w-0 space-y-5">
        <Section title="기본 정보" hint="* 필수 입력">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="이름 *" id="name"><Input id="name" name="name" required defaultValue={animal?.name ?? ""} placeholder="아이 이름" /></Field>
            <Field label="품종" id="breed"><Input id="breed" name="breed" defaultValue={animal?.breed ?? ""} placeholder="예: 믹스" /></Field>
            <Field label="성별" id="gender"><select id="gender" name="gender" defaultValue={animal?.gender ?? "미상"} className={selectClass}>{ANIMAL_GENDERS.map(value => <option key={value}>{value}</option>)}</select></Field>
            {kind === "dogs" && <Field label="크기" id="size"><select id="size" name="size" defaultValue={animal && "size" in animal ? animal.size ?? "" : ""} className={selectClass}><option value="">선택</option>{ANIMAL_SIZES.map(value => <option key={value}>{value}</option>)}</select></Field>}
            <Field label="생년월일" id="birth_date"><Input id="birth_date" name="birth_date" type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} /><p className="mt-2 text-xs leading-5 text-muted-foreground">{age ? `오늘 기준 ${age} · 나이는 자동 계산됩니다.` : "정확히 알 때만 입력해 주세요."}</p></Field>
            <Field label="추정 나이 (개월)" id="age_months"><Input id="age_months" name="age_months" type="number" min={0} defaultValue={animal?.age_months ?? ""} disabled={!!birthDate} placeholder="예: 24" /><p className="mt-2 text-xs leading-5 text-muted-foreground">{birthDate ? "생년월일로 계산한 나이를 사용합니다." : "생년월일을 모를 때 입력해 주세요."}</p></Field>
            <Field label="몸무게 (kg)" id="weight_kg"><Input id="weight_kg" name="weight_kg" type="number" min={0} step={0.1} defaultValue={animal?.weight_kg ?? ""} placeholder="예: 4.5" /></Field>
          </div>
        </Section>
        <Section title="보호·건강 정보">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="보호 상태" id="status"><select id="status" name="status" defaultValue={animal?.status ?? "보호중"} className={selectClass}>{ANIMAL_STATUSES.map(value => <option key={value}>{value}</option>)}</select></Field>
            <Field label="중성화" id="neutered"><select id="neutered" name="neutered" defaultValue={neutered} className={selectClass}><option value="">미상</option><option value="true">완료</option><option value="false">미완료</option></select></Field>
            <Field label="보호 시작일" id="rescue_date"><Input id="rescue_date" name="rescue_date" type="date" defaultValue={animal?.rescue_date ?? ""} /></Field>
            <Field label="보호 위치" id="kennel_location"><Input id="kennel_location" name="kennel_location" defaultValue={animal?.kennel_location ?? ""} placeholder="예: A동 2번" /><p className="mt-2 text-xs text-muted-foreground">관리자에게만 표시됩니다.</p></Field>
            <div className="sm:col-span-2"><Field label="건강 정보" id="health_info"><Textarea id="health_info" name="health_info" rows={3} defaultValue={animal?.health_info ?? ""} placeholder="접종 여부, 치료 이력 등 알아두어야 할 내용을 적어주세요." /></Field></div>
          </div>
        </Section>
        <Section title="아이 소개" hint="회원 공개">
          <div className="space-y-4">
            <Field label="성격" id="personality"><Textarea id="personality" name="personality" rows={3} defaultValue={animal?.personality ?? ""} placeholder="아이의 성격과 좋아하는 것을 적어주세요." /></Field>
            <Field label="소개글 · 특이사항" id="description"><Textarea id="description" name="description" rows={5} defaultValue={animal?.description ?? ""} placeholder="구조 배경이나 함께 생활할 때 참고할 내용을 적어주세요." /></Field>
          </div>
        </Section>
      </div>
    </fieldset>
    <div className="sticky bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-20 rounded-xl border border-border bg-card p-4 shadow-sm md:bottom-4">
      {error && <p role="alert" className="mb-3 break-words text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3"><p role="status" className="text-xs text-muted-foreground">{photoBusy ? "사진 작업이 끝나면 저장할 수 있습니다." : "저장 후 목록으로 돌아갑니다."}</p><div className="flex w-full gap-2 sm:w-auto">
        <Link href={listHref} aria-disabled={pending || photoBusy} onClick={event => { if (pending || photoBusy) event.preventDefault() }} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-border px-5 text-sm hover:bg-muted aria-disabled:opacity-50 sm:flex-none">취소</Link>
        <Button type="submit" disabled={pending || photoBusy} className="min-h-11 flex-1 sm:flex-none">{pending ? "저장 중…" : animal ? "변경사항 저장" : "아이 등록"}</Button>
      </div></div>
    </div>
  </form>
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return <section className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5"><div className="mb-5 flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-semibold">{title}</h2>{hint && <p className="text-xs text-muted-foreground">{hint}</p>}</div>{children}</section>
}
function Field({ label, id, children }: { label: string; id: string; children: ReactNode }) {
  return <div className="min-w-0 space-y-2"><label htmlFor={id} className="block text-sm font-medium">{label}</label>{children}</div>
}
