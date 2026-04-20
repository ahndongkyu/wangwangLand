import Link from "next/link"
import type { Metadata } from "next"

import { DogGrid, listDogs } from "@/features/dogs"
import { cn } from "@/shared/lib/utils"
import type { DogSize, DogStatus } from "@/shared/types/database"

export const metadata: Metadata = {
  title: "입양 대기 강아지",
  description:
    "왕왕랜드에서 새 가족을 기다리고 있는 강아지들을 만나보세요.",
}

export const revalidate = 60

const STATUS_FILTERS: Array<{ label: string; value: DogStatus | "전체" }> = [
  { label: "보호중", value: "보호중" },
  { label: "임시보호중", value: "임시보호중" },
  { label: "입양완료", value: "입양완료" },
  { label: "전체", value: "전체" },
]

const SIZE_FILTERS: Array<{ label: string; value: DogSize | "전체" }> = [
  { label: "전체", value: "전체" },
  { label: "소", value: "소" },
  { label: "중소", value: "중소" },
  { label: "중", value: "중" },
  { label: "중대", value: "중대" },
  { label: "대", value: "대" },
  { label: "대대", value: "대대" },
]

function parseStatus(value: string | undefined): DogStatus | "전체" {
  if (!value) return "보호중"
  const found = STATUS_FILTERS.find((f) => f.value === value)
  return found ? found.value : "보호중"
}

function parseSize(value: string | undefined): DogSize | "전체" {
  if (!value) return "전체"
  const found = SIZE_FILTERS.find((f) => f.value === value)
  return found ? found.value : "전체"
}

function buildHref(status: string, size: string) {
  const params = new URLSearchParams()
  if (status !== "보호중") params.set("status", status)
  if (size !== "전체") params.set("size", size)
  const qs = params.toString()
  return qs ? `/dogs?${qs}` : "/dogs"
}

export default async function DogsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; size?: string }>
}) {
  const params = await searchParams
  const activeStatus = parseStatus(params.status)
  const activeSize = parseSize(params.size)
  const dogs = await listDogs({
    status: activeStatus,
    size: activeSize,
    limit: 100,
  })

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground md:text-4xl">
          입양 대기 강아지
        </h1>
        <p className="mt-2 text-muted-foreground">
          왕왕랜드에서 새 가족을 기다리고 있는 친구들입니다.
        </p>
      </header>

      <div className="mb-8 space-y-4">
        <FilterGroup
          label="상태"
          options={STATUS_FILTERS.map((f) => ({
            label: f.label,
            value: String(f.value),
            active: activeStatus === f.value,
            href: buildHref(String(f.value), String(activeSize)),
          }))}
        />
        <FilterGroup
          label="크기"
          options={SIZE_FILTERS.map((f) => ({
            label: f.label,
            value: String(f.value),
            active: activeSize === f.value,
            href: buildHref(String(activeStatus), String(f.value)),
          }))}
        />
      </div>

      <DogGrid
        dogs={dogs}
        emptyMessage={
          `'${activeStatus}${activeSize !== "전체" ? ` · ${activeSize}` : ""}' 조건에 해당하는 아이가 없어요.`
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
