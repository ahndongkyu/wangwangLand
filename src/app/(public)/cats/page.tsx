import Link from "next/link"
import type { Metadata } from "next"

import { CatGrid, listCats } from "@/features/cats"
import type { CatSort } from "@/features/cats/api/queries"
import { cn } from "@/shared/lib/utils"
import type { DogStatus } from "@/shared/types/database"

export const metadata: Metadata = {
  title: "입양 대기 고양이",
  description:
    "왕왕랜드에서 새 가족을 기다리고 있는 고양이들을 만나보세요.",
}

export const revalidate = 60

const STATUS_FILTERS: Array<{ label: string; value: DogStatus | "전체" }> = [
  { label: "보호중", value: "보호중" },
  { label: "임시보호중", value: "임시보호중" },
  { label: "입양완료", value: "입양완료" },
  { label: "전체", value: "전체" },
]

const SORT_OPTIONS: Array<{ label: string; value: CatSort }> = [
  { label: "최신순", value: "latest" },
  { label: "이름순", value: "name" },
]

function parseStatus(value: string | undefined): DogStatus | "전체" {
  if (!value) return "보호중"
  const found = STATUS_FILTERS.find((f) => f.value === value)
  return found ? found.value : "보호중"
}

function parseSort(value: string | undefined): CatSort {
  return value === "name" ? "name" : "latest"
}

function buildHref(status: string, sort: CatSort) {
  const params = new URLSearchParams()
  if (status !== "보호중") params.set("status", status)
  if (sort !== "latest") params.set("sort", sort)
  const qs = params.toString()
  return qs ? `/cats?${qs}` : "/cats"
}

export default async function CatsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; sort?: string }>
}) {
  const params = await searchParams
  const activeStatus = parseStatus(params.status)
  const activeSort = parseSort(params.sort)
  const cats = await listCats({
    status: activeStatus,
    sort: activeSort,
    limit: 100,
  })

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground md:text-4xl">
            입양 대기 고양이
          </h1>
          <p className="mt-2 text-muted-foreground">
            왕왕랜드에서 새 가족을 기다리고 있는 냥이들입니다.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          총 <span className="font-bold text-foreground">{cats.length}</span>마리
        </p>
      </header>

      <div className="mb-8 space-y-4">
        <FilterGroup
          label="상태"
          options={STATUS_FILTERS.map((f) => ({
            label: f.label,
            value: String(f.value),
            active: activeStatus === f.value,
            href: buildHref(String(f.value), activeSort),
          }))}
        />
        <FilterGroup
          label="정렬"
          options={SORT_OPTIONS.map((o) => ({
            label: o.label,
            value: o.value,
            active: activeSort === o.value,
            href: buildHref(String(activeStatus), o.value),
          }))}
        />
      </div>

      <CatGrid
        cats={cats}
        emptyMessage={
          activeStatus === "전체"
            ? "아직 등록된 고양이가 없어요."
            : `'${activeStatus}' 상태인 고양이가 아직 없어요.`
        }
      />
    </div>
  )
}

function FilterGroup({
  label,
  options,
}: {
  label: string
  options: { label: string; value: string; active: boolean; href: string }[]
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-10 text-xs font-semibold text-muted-foreground">
        {label}
      </span>
      {options.map((o) => (
        <Link
          key={o.value}
          href={o.href}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            o.active
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground/80 hover:bg-secondary"
          )}
        >
          {o.label}
        </Link>
      ))}
    </div>
  )
}
