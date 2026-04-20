import Link from "next/link"
import type { Metadata } from "next"

import { DogGrid, listDogs } from "@/features/dogs"
import { cn } from "@/shared/lib/utils"
import type { DogStatus } from "@/shared/types/database"

export const metadata: Metadata = {
  title: "입양 대기 아이들",
  description:
    "왕왕랜드에서 새 가족을 기다리고 있는 아이들을 만나보세요.",
}

export const revalidate = 60

const FILTERS: Array<{ label: string; value: DogStatus | "전체" }> = [
  { label: "전체", value: "전체" },
  { label: "보호중", value: "보호중" },
  { label: "임시보호중", value: "임시보호중" },
  { label: "입양완료", value: "입양완료" },
]

function parseStatus(value: string | undefined): DogStatus | "전체" {
  if (!value) return "보호중"
  const found = FILTERS.find((f) => f.value === value)
  return found ? found.value : "보호중"
}

export default async function DogsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const params = await searchParams
  const activeStatus = parseStatus(params.status)
  const dogs = await listDogs({ status: activeStatus, limit: 50 })

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground md:text-4xl">
          입양 대기 아이들
        </h1>
        <p className="mt-2 text-muted-foreground">
          왕왕랜드에서 새 가족을 기다리고 있는 친구들입니다.
        </p>
      </header>

      <nav className="mb-8 flex flex-wrap gap-2" aria-label="상태 필터">
        {FILTERS.map((filter) => {
          const isActive = activeStatus === filter.value
          const href =
            filter.value === "보호중"
              ? "/dogs"
              : `/dogs?status=${encodeURIComponent(filter.value)}`
          return (
            <Link
              key={filter.value}
              href={href}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground/80 hover:bg-secondary"
              )}
            >
              {filter.label}
            </Link>
          )
        })}
      </nav>

      <DogGrid
        dogs={dogs}
        emptyMessage={
          activeStatus === "전체"
            ? "아직 등록된 아이가 없어요."
            : `'${activeStatus}' 상태인 아이가 아직 없어요.`
        }
      />
    </div>
  )
}
