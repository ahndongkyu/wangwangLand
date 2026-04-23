import Image from "next/image"
import Link from "next/link"

import { getCurrentAdmin } from "@/features/auth"
import { CatRowActions, CatStatusSelect, listCatsWithCount } from "@/features/cats"
import type { CatSort } from "@/features/cats/api/queries"
import { FilterGroup } from "@/shared/components/filter-group"
import { Pagination } from "@/shared/components/pagination"
import { SearchBox } from "@/shared/components/search-box"
import { buttonVariants } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"
import type { DogGender, DogStatus } from "@/shared/types/database"

export const dynamic = "force-dynamic"

const PAGE_SIZE_OPTIONS = [20, 50, 100]
const DEFAULT_PAGE_SIZE = 20

const STATUS_FILTERS: Array<{ label: string; value: DogStatus | "전체" }> = [
  { label: "전체", value: "전체" },
  { label: "보호중", value: "보호중" },
  { label: "임시보호중", value: "임시보호중" },
  { label: "입양완료", value: "입양완료" },
  { label: "무지개다리", value: "무지개다리" },
]

const GENDER_FILTERS: Array<{ label: string; value: DogGender | "전체" }> = [
  { label: "전체", value: "전체" },
  { label: "수컷", value: "수컷" },
  { label: "암컷", value: "암컷" },
  { label: "미상", value: "미상" },
]

const NEUTERED_FILTERS: Array<{ label: string; value: "전체" | "true" | "false" }> = [
  { label: "전체", value: "전체" },
  { label: "중성화 완료", value: "true" },
  { label: "미완료", value: "false" },
]

const SORT_OPTIONS: Array<{ label: string; value: CatSort }> = [
  { label: "최신순", value: "latest" },
  { label: "이름순", value: "name" },
]

function parseStatus(value: string | undefined): DogStatus | "전체" {
  if (!value) return "전체"
  const found = STATUS_FILTERS.find((f) => f.value === value)
  return found ? found.value : "전체"
}

function parseGender(value: string | undefined): DogGender | "전체" {
  if (!value) return "전체"
  const found = GENDER_FILTERS.find((f) => f.value === value)
  return found ? found.value : "전체"
}

function parseNeutered(value: string | undefined): "전체" | "true" | "false" {
  if (value === "true") return "true"
  if (value === "false") return "false"
  return "전체"
}

function parseSort(value: string | undefined): CatSort {
  return value === "name" ? "name" : "latest"
}

function parsePageSize(value: string | undefined): number {
  const n = Number(value)
  return PAGE_SIZE_OPTIONS.includes(n) ? n : DEFAULT_PAGE_SIZE
}

function buildHref(params: {
  status: string
  gender: string
  neutered: string
  sort: CatSort
  q: string
  pageSize: number
}) {
  const qs = new URLSearchParams()
  if (params.status !== "전체") qs.set("status", params.status)
  if (params.gender !== "전체") qs.set("gender", params.gender)
  if (params.neutered !== "전체") qs.set("neutered", params.neutered)
  if (params.sort !== "latest") qs.set("sort", params.sort)
  if (params.q) qs.set("q", params.q)
  if (params.pageSize !== DEFAULT_PAGE_SIZE) qs.set("pageSize", String(params.pageSize))
  const s = qs.toString()
  return s ? `/admin/cats?${s}` : "/admin/cats"
}

export default async function AdminCatsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    page?: string
    status?: string
    gender?: string
    neutered?: string
    sort?: string
    pageSize?: string
  }>
}) {
  const params = await searchParams
  const activeQuery = (params.q ?? "").trim()
  const activeStatus = parseStatus(params.status)
  const activeGender = parseGender(params.gender)
  const activeNeutered = parseNeutered(params.neutered)
  const activeSort = parseSort(params.sort)
  const pageSize = parsePageSize(params.pageSize)
  const pageNum = Math.max(1, Number(params.page ?? 1) || 1)
  const offset = (pageNum - 1) * pageSize

  const [me, { cats, total }] = await Promise.all([
    getCurrentAdmin(),
    listCatsWithCount({
      status: activeStatus,
      gender: activeGender,
      neutered: activeNeutered,
      sort: activeSort,
      query: activeQuery || undefined,
      limit: pageSize,
      offset,
    }),
  ])
  const canDelete = me?.role === "admin"

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const startIdx = offset + 1
  const endIdx = offset + cats.length

  const hrefBase = {
    status: String(activeStatus),
    gender: String(activeGender),
    neutered: String(activeNeutered),
    sort: activeSort,
    q: activeQuery,
    pageSize,
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">
            고양이 관리
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeQuery && `'${activeQuery}' 검색 결과 `}
            전체 <span className="font-semibold text-foreground">{total}</span>마리
            {total > 0 && (
              <>
                {" "}· {startIdx}~{endIdx} 표시
              </>
            )}
          </p>
        </div>
        <Link href="/admin/cats/new" className={cn(buttonVariants())}>
          + 새 아이 등록
        </Link>
      </header>

      <div className="mb-4 max-w-md">
        <SearchBox placeholder="이름, 품종, 특징 검색" />
      </div>

      <div className="mb-6 space-y-3">
        <FilterGroup
          label="상태"
          options={STATUS_FILTERS.map((f) => ({
            label: f.label,
            value: String(f.value),
            active: activeStatus === f.value,
            href: buildHref({ ...hrefBase, status: String(f.value) }),
          }))}
        />
        <FilterGroup
          label="성별"
          options={GENDER_FILTERS.map((f) => ({
            label: f.label,
            value: String(f.value),
            active: activeGender === f.value,
            href: buildHref({ ...hrefBase, gender: String(f.value) }),
          }))}
        />
        <FilterGroup
          label="중성화"
          options={NEUTERED_FILTERS.map((f) => ({
            label: f.label,
            value: f.value,
            active: activeNeutered === f.value,
            href: buildHref({ ...hrefBase, neutered: f.value }),
          }))}
        />
        <FilterGroup
          label="정렬"
          options={SORT_OPTIONS.map((o) => ({
            label: o.label,
            value: o.value,
            active: activeSort === o.value,
            href: buildHref({ ...hrefBase, sort: o.value }),
          }))}
        />
      </div>

      {cats.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          {activeQuery
            ? `'${activeQuery}' 검색 결과가 없습니다.`
            : "아직 등록된 고양이가 없습니다. 위 버튼을 눌러 첫 아이를 등록해 보세요."}
        </div>
      ) : (
        <>
          {/* Page size selector */}
          <div className="mb-3 flex items-center justify-end gap-2">
            <span className="text-xs text-muted-foreground">페이지당</span>
            {PAGE_SIZE_OPTIONS.map((size) => (
              <Link
                key={size}
                href={buildHref({ ...hrefBase, pageSize: size })}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  pageSize === size
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground hover:bg-secondary/80"
                )}
              >
                {size}
              </Link>
            ))}
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full">
              <thead className="border-b border-border bg-secondary/40 text-left text-sm">
                <tr>
                  <th className="px-4 py-3 font-semibold">사진</th>
                  <th className="px-4 py-3 font-semibold">이름</th>
                  <th className="hidden px-4 py-3 font-semibold md:table-cell">
                    품종
                  </th>
                  <th className="px-4 py-3 font-semibold">상태</th>
                  <th className="hidden px-4 py-3 font-semibold lg:table-cell">
                    위치
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">작업</th>
                </tr>
              </thead>
              <tbody>
                {cats.map((cat) => {
                  const thumb = cat.images[cat.thumbnail_index] ?? cat.images[0]
                  return (
                    <tr
                      key={cat.id}
                      className="border-b border-border last:border-0 hover:bg-secondary/30 [&:hover>td:first-child]:border-l-2 [&:hover>td:first-child]:border-l-primary/60"
                    >
                      <td className="px-4 py-3">
                        <div className="relative size-12 overflow-hidden rounded-md bg-muted">
                          {thumb ? (
                            <Image
                              src={thumb}
                              alt={cat.name}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-lg">
                              🐱
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">{cat.name}</td>
                      <td className="hidden px-4 py-3 text-sm text-muted-foreground md:table-cell">
                        {cat.breed ?? "-"}
                      </td>
                      <td className="px-4 py-3">
                        <CatStatusSelect id={cat.id} status={cat.status} />
                      </td>
                      <td className="hidden px-4 py-3 text-sm text-muted-foreground lg:table-cell">
                        {cat.kennel_location ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <CatRowActions id={cat.id} name={cat.name} canDelete={canDelete} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={pageNum}
            totalPages={totalPages}
            basePath="/admin/cats"
            searchParams={{
              q: activeQuery || undefined,
              status: activeStatus !== "전체" ? activeStatus : undefined,
              gender: activeGender !== "전체" ? activeGender : undefined,
              neutered: activeNeutered !== "전체" ? activeNeutered : undefined,
              sort: activeSort !== "latest" ? activeSort : undefined,
              pageSize: pageSize !== DEFAULT_PAGE_SIZE ? String(pageSize) : undefined,
            }}
          />
        </>
      )}
    </div>
  )
}
