import type { Metadata } from "next"

import { listProfiles } from "@/features/members"
import { AdminMembersTable } from "@/features/members"
import { getCurrentAdmin } from "@/features/auth"
import { Pagination } from "@/shared/components/pagination"
import { SearchBox } from "@/shared/components/search-box"
import { AdminFilterBar } from "@/shared/components/admin-filter-bar"
import { EmptyState } from "@/shared/components/empty-state"
import { cn } from "@/shared/lib/utils"
import type { Profile } from "@/features/members"

export const metadata: Metadata = { title: "회원 관리" }
export const dynamic = "force-dynamic"

const PAGE_SIZE = 10

const STATUS_FILTERS = [
  { label: "가입 미완료", value: "pending" },
  { label: "정상 회원", value: "approved" },
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
  const filterStatus = (params.status ?? "") as Profile["status"] | ""
  const sortRaw = params.sort ?? "status"
  const sort: SortValue = (["status", "name", "joined"].includes(sortRaw) ? sortRaw : "status") as SortValue
  const activeQuery = (params.q ?? "").trim()
  const pageNum = Math.max(1, Number(params.page ?? 1) || 1)
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

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">회원 관리</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">전체 {total}명</span>
            {pendingCount > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                가입 미완료 {pendingCount}
              </span>
            )}
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
              정상 {approvedCount}
            </span>
            {rejectedCount > 0 && (
              <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive">
                거절 {rejectedCount}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchBox placeholder="닉네임 또는 전화번호 검색" className="max-w-64" />
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
          <AdminMembersTable profiles={profiles} isTopAdmin={isTopAdmin} />

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
