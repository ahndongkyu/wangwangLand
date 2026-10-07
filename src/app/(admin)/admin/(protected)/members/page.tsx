import type { Metadata } from "next"

import { listProfiles } from "@/features/members"
import { AdminMembersTable } from "@/features/members"
import { getCurrentAdmin } from "@/features/auth"
import { Pagination } from "@/shared/components/pagination"
import { SearchBox } from "@/shared/components/search-box"
import { AdminFilterBar } from "@/shared/components/admin-filter-bar"
import { EmptyState } from "@/shared/components/empty-state"
import Link from "next/link"
import type { Profile } from "@/features/members"

export const metadata: Metadata = { title: "회원 관리" }
export const dynamic = "force-dynamic"

const PAGE_SIZE = 20

const STATUS_FILTERS = [
  { label: "가입 미완료", value: "pending" },
  { label: "가입 완료", value: "approved" },
  { label: "거절", value: "rejected" },
]

const SORT_FILTERS = [
  { label: "상태순", value: "status" },
  { label: "이름순", value: "name" },
  { label: "가입순", value: "joined" },
]

type SortValue = "status" | "name" | "joined"

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; q?: string; sort?: string }>
}) {
  const params = await searchParams
  const filterStatus = STATUS_FILTERS.some(s => s.value === params.status) ? params.status as Profile["status"] : ""
  const sortRaw = params.sort ?? "status"
  const sort: SortValue = (["status", "name", "joined"].includes(sortRaw) ? sortRaw : "status") as SortValue
  const activeQuery = (params.q ?? "").trim()
  const rawPage = Number(params.page ?? 1)
  const pageNum = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1
  const offset = (pageNum - 1) * PAGE_SIZE

  const [{ profiles, total, pendingCount, approvedCount, rejectedCount }, me] = await Promise.all([
    listProfiles({
      status: filterStatus || undefined,
      sort,
      query: activeQuery || undefined,
      limit: PAGE_SIZE,
      offset,
    }),
    getCurrentAdmin(),
  ])

  const isTopAdmin = me?.role === "admin"
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const context = new URLSearchParams()
  if (filterStatus) context.set("status", filterStatus)
  if (activeQuery) context.set("q", activeQuery)
  if (sort !== "status") context.set("sort", sort)
  if (pageNum > 1) context.set("page", String(pageNum))
  const returnHref = `/admin/members${context.size ? `?${context}` : ""}`
  function statusHref(status: string) {
    const next = new URLSearchParams(context)
    next.delete("page")
    if (status) next.set("status", status)
    else next.delete("status")
    return `/admin/members${next.size ? `?${next}` : ""}`
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">회원 관리</h1>
          <p className="mt-2 text-sm text-muted-foreground">회원 정보를 확인하고, 상세 화면에서 권한과 이용 상태를 관리하세요.</p>
          <p className="mt-2 text-sm text-muted-foreground">검색 결과 <span className="font-medium tabular-nums text-foreground">{total}명</span></p>
        </div>
      </header>

      <section aria-label="전체 회원 현황" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[{ label: "전체 회원", value: "", count: pendingCount + approvedCount + rejectedCount }, { label: "가입 완료", value: "approved", count: approvedCount }, { label: "가입 미완료", value: "pending", count: pendingCount }, { label: "거절", value: "rejected", count: rejectedCount }].map(s => <Link key={s.label} href={statusHref(s.value)} aria-current={filterStatus === s.value ? "page" : undefined} className={`rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-ring ${filterStatus === s.value ? "border-primary/40" : "border-border"}`}><p className="text-xs text-muted-foreground">{s.label}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{s.count}<span className="ml-1 text-sm font-normal text-muted-foreground">명</span></p></Link>)}
      </section>
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
        <SearchBox placeholder="닉네임 또는 전화번호 검색" className="w-full sm:w-72" />
        <AdminFilterBar
          filters={[
            {
              name: "status",
              defaultLabel: "모든 상태",
              options: STATUS_FILTERS,
            },
            {
              name: "sort",
              defaultLabel: "상태순",
              options: SORT_FILTERS,
            },
          ]}
        />
      </div>

      {profiles.length === 0 ? (
        <EmptyState
          title={
            activeQuery
              ? `'${activeQuery}' 검색 결과가 없습니다`
              : "해당하는 회원이 없습니다"
          }
        />
      ) : (
        <>
          <AdminMembersTable profiles={profiles} isTopAdmin={isTopAdmin} returnHref={returnHref} />

          <Pagination
            currentPage={pageNum}
            totalPages={totalPages}
            basePath="/admin/members"
            searchParams={{
              status: filterStatus || undefined,
              sort: sort !== "status" ? sort : undefined,
              q: activeQuery || undefined,
            }}
          />
        </>
      )}
    </div>
  )
}
