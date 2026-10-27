"use client"

import { useEffect, useRef, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ANIMAL_GENDERS, ANIMAL_SIZES, animalFilterParams, animalListHref, type AnimalKind, type parseAnimalFilters } from "../lib/admin-filters"

export function AnimalMobileFilters({ kind, filters }: { kind: AnimalKind; filters: ReturnType<typeof parseAnimalFilters> }) {
  const router = useRouter()
  const dialog = useRef<HTMLDialogElement>(null)
  const [pending, startTransition] = useTransition()
  const currentHref = animalListHref(kind, animalFilterParams(filters))
  useEffect(() => { dialog.current?.close() }, [currentHref])
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)")
    const closeOnDesktop = () => { if (desktop.matches) dialog.current?.close() }
    desktop.addEventListener("change", closeOnDesktop)
    return () => desktop.removeEventListener("change", closeOnDesktop)
  }, [])
  const summary = [
    filters.size !== "전체" ? `크기 ${filters.size}` : "",
    filters.gender !== "전체" ? filters.gender : "",
    filters.neutered !== "전체" ? `중성화 ${filters.neutered === "true" ? "완료" : "미완료"}` : "",
    filters.sort === "name" ? "이름순" : filters.sort === "pinned" ? "고정순" : "",
    filters.pageSize !== 20 ? `${filters.pageSize}개씩` : "",
  ].filter(Boolean)
  const options = (values: readonly string[]) => values.map(value => ({ value, label: value }))
  const fields = [
    ...(kind === "dogs" ? [{ name: "size", label: "크기", value: filters.size, options: options(["전체", ...ANIMAL_SIZES]) }] : []),
    { name: "gender", label: "성별", value: filters.gender, options: options(["전체", ...ANIMAL_GENDERS]) },
    { name: "neutered", label: "중성화", value: filters.neutered, options: [{ value: "전체", label: "전체" }, { value: "true", label: "완료" }, { value: "false", label: "미완료" }] },
    { name: "sort", label: "정렬", value: filters.sort, options: [{ value: "latest", label: "최근 수정순" }, { value: "name", label: "이름순" }, ...(kind === "dogs" ? [{ value: "pinned", label: "고정순" }] : [])] },
    { name: "pageSize", label: "표시 개수", value: String(filters.pageSize), options: [20, 50, 100].map(value => ({ value: String(value), label: `${value}개` })) },
  ]
  function navigate(params: Record<string, string | undefined>) {
    if (pending) return
    startTransition(() => router.push(animalListHref(kind, params), { scroll: false }))
    dialog.current?.close()
  }
  return <div className="mb-4 md:hidden">
    <button type="button" disabled={pending} aria-haspopup="dialog" onClick={() => {
      dialog.current?.querySelector("form")?.reset()
      dialog.current?.showModal()
    }} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50">
      필터 · 정렬{summary.length > 0 && <span className="text-primary">{summary.length}개 적용</span>}
    </button>
    <p role="status" className="mt-2 break-words text-xs leading-5 text-muted-foreground">{pending ? "목록을 불러오는 중입니다." : summary.join(" · ") || "최근 수정순 · 20개씩"}</p>
    <dialog ref={dialog} aria-label="아이들 필터 및 정렬" className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-4 text-foreground shadow-xl backdrop:bg-black/50">
      <div className="mb-4 flex items-center justify-between gap-3"><h2 className="font-semibold">필터 · 정렬</h2><button type="button" onClick={() => dialog.current?.close()} className="min-h-11 px-3 text-sm hover:text-primary">닫기</button></div>
      <form key={currentHref} onSubmit={event => {
        event.preventDefault()
        const values = Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string, string>
        navigate({ ...animalFilterParams(filters), ...values })
      }} className="space-y-4">
        {fields.map(field => <label key={field.name} className="grid min-w-0 gap-2 text-sm"><span>{field.label}</span><select name={field.name} defaultValue={field.value} className="min-h-11 w-full min-w-0 rounded-lg border border-border bg-card px-3 text-base text-foreground focus-visible:outline-2 focus-visible:outline-ring">{field.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>)}
        <div className="flex gap-2 border-t border-border pt-4">
          <button type="button" disabled={pending} onClick={() => navigate({ q: filters.q || undefined, status: filters.status === "전체" ? undefined : filters.status })} className="min-h-11 flex-1 rounded-lg border border-border px-3 text-sm hover:bg-muted">조건 초기화</button>
          <button type="submit" disabled={pending} className="min-h-11 flex-1 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90">적용</button>
        </div>
      </form>
    </dialog>
  </div>
}
