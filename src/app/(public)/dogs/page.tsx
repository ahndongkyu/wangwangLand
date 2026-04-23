import type { Metadata } from "next"
import { Suspense } from "react"

import { DogGrid, listDogsWithCount } from "@/features/dogs"
import type { DogSort } from "@/features/dogs/api/queries"
import { FilterGroup } from "@/shared/components/filter-group"
import { Pagination } from "@/shared/components/pagination"
import { SearchBox } from "@/shared/components/search-box"
import type { DogSize, DogStatus } from "@/shared/types/database"

export const metadata: Metadata = {
  title: "입양 대기 강아지",
  description:
    "왕왕랜드에서 새 가족을 기다리고 있는 강아지들을 만나보세요.",
}

export const revalidate = 60

const PAGE_SIZE = 24

const STATUS_FILTERS: Array<{ label: string; value: DogStatus | "전체" }> = [
  { label: "전체", value: "전체" },
  { label: "보호중", value: "보호중" },
  { label: "임시보호중", value: "임시보호중" },
  { label: "입양완료", value: "입양완료" },
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

const SORT_OPTIONS: Array<{ label: string; value: DogSort }> = [
  { label: "최신순", value: "latest" },
  { label: "이름순", value: "name" },
]

function parseStatus(value: string | undefined): DogStatus | "전체" {
  if (!value) return "전체"
  const found = STATUS_FILTERS.find((f) => f.value === value)
  return found ? found.value : "전체"
}

function parseSize(value: string | undefined): DogSize | "전체" {
  if (!value) return "전체"
  const found = SIZE_FILTERS.find((f) => f.value === value)
  return found ? found.value : "전체"
}

function parseSort(value: string | undefined): DogSort {
  return value === "name" ? "name" : "latest"
}

function buildHref(
  status: string,
  size: string,
  sort: DogSort,
  q: string
) {
  const params = new URLSearchParams()
  if (status !== "전체") params.set("status", status)
  if (size !== "전체") params.set("size", size)
  if (sort !== "latest") params.set("sort", sort)
  if (q) params.set("q", q)
  const qs = params.toString()
  return qs ? `/dogs?${qs}` : "/dogs"
}

export default async function DogsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string
    size?: string
    sort?: string
    q?: string
    page?: string
  }>
}) {
  const params = await searchParams
  const activeStatus = parseStatus(params.status)
  const activeSize = parseSize(params.size)
  const activeSort = parseSort(params.sort)
  const activeQuery = (params.q ?? "").trim()
  const pageNum = Math.max(1, Number(params.page ?? 1) || 1)
  const offset = (pageNum - 1) * PAGE_SIZE

  const { dogs, total } = await listDogsWithCount({
    status: activeStatus,
    size: activeSize,
    sort: activeSort,
    query: activeQuery || undefined,
    limit: PAGE_SIZE,
    offset,
  })

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground md:text-4xl">
            입양 대기 강아지
          </h1>
          <p className="mt-2 text-muted-foreground">
            왕왕랜드에서 새 가족을 기다리고 있는 친구들입니다.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          총 <span className="font-bold text-foreground">{total}</span>마리
        </p>
      </header>

      <div className="mb-8 space-y-4">
        <Suspense fallback={null}>
          <SearchBox placeholder="강아지 이름으로 검색" className="max-w-md" />
        </Suspense>
        <FilterGroup
          label="상태"
          options={STATUS_FILTERS.map((f) => ({
            label: f.label,
            value: String(f.value),
            active: activeStatus === f.value,
            href: buildHref(
              String(f.value),
              String(activeSize),
              activeSort,
              activeQuery
            ),
          }))}
        />
        <FilterGroup
          label="크기"
          options={SIZE_FILTERS.map((f) => ({
            label: f.label,
            value: String(f.value),
            active: activeSize === f.value,
            href: buildHref(
              String(activeStatus),
              String(f.value),
              activeSort,
              activeQuery
            ),
          }))}
        />
        <FilterGroup
          label="정렬"
          options={SORT_OPTIONS.map((o) => ({
            label: o.label,
            value: o.value,
            active: activeSort === o.value,
            href: buildHref(
              String(activeStatus),
              String(activeSize),
              o.value,
              activeQuery
            ),
          }))}
        />
      </div>

      <DogGrid
        dogs={dogs}
        emptyMessage={
          activeQuery
            ? `'${activeQuery}' 검색 결과가 없습니다.`
            : `'${activeStatus}${activeSize !== "전체" ? ` · ${activeSize}` : ""}' 조건에 해당하는 아이가 없어요.`
        }
      />

      <Pagination
        currentPage={pageNum}
        totalPages={totalPages}
        basePath="/dogs"
        searchParams={{
          status: activeStatus !== "전체" ? activeStatus : undefined,
          size: activeSize !== "전체" ? activeSize : undefined,
          sort: activeSort !== "latest" ? activeSort : undefined,
          q: activeQuery || undefined,
        }}
      />
    </div>
  )
}

