import Link from "next/link"

import { listNotices } from "@/features/notices"
import { deleteNotice, bulkDeleteNotices } from "@/features/notices/api/mutations"
import { AdminNoticesTable } from "@/features/notices/components/admin-notices-table"
import { Pagination } from "@/shared/components/pagination"
import { SearchBox } from "@/shared/components/search-box"
import { AdminFilterBar } from "@/shared/components/admin-filter-bar"
import { EmptyState } from "@/shared/components/empty-state"
import { buttonVariants } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"

export const dynamic = "force-dynamic"

const PAGE_SIZE = 20

const CATEGORY_FILTERS = [
  { label: "공지", value: "공지" },
  { label: "이벤트", value: "이벤트" },
  { label: "모집", value: "모집" },
  { label: "행사", value: "행사" },
]

const STATUS_FILTERS = [
  { label: "공개", value: "published" },
  { label: "임시저장", value: "draft" },
]

export default async function AdminNoticesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; status?: string; category?: string }>
}) {
  const params = await searchParams
  const activeQuery = (params.q ?? "").trim()
  const pageNum = Math.max(1, Number(params.page ?? 1) || 1)
  const offset = (pageNum - 1) * PAGE_SIZE
  const status = params.status === "published" || params.status === "draft" ? params.status : undefined
  const category = (params.category ?? "").trim() || undefined

  const { notices, total, publishedCount, draftCount } = await listNotices({
    includeDrafts: true,
    query: activeQuery || undefined,
    limit: PAGE_SIZE,
    offset,
    status,
    category,
  })

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">공지사항 관리</h1>
          <div className="mt-1 flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">전체 {total}건</span>
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
              공개 {publishedCount}
            </span>
            {draftCount > 0 && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                임시저장 {draftCount}
              </span>
            )}
          </div>
        </div>
        <Link href="/admin/notices/new" className={cn(buttonVariants())}>
          + 새 공지 작성
        </Link>
      </header>

      <div className="mb-4 flex flex-wrap gap-3">
        <SearchBox placeholder="제목으로 검색" className="max-w-64" />
        <AdminFilterBar
          filters={[
            {
              name: "category",
              defaultLabel: "모든 카테고리",
              options: CATEGORY_FILTERS,
            },
            {
              name: "status",
              defaultLabel: "모든 상태",
              options: STATUS_FILTERS,
            },
          ]}
        />
      </div>

      {notices.length === 0 ? (
        <EmptyState
          title={
            activeQuery
              ? `'${activeQuery}' 검색 결과가 없습니다`
              : "아직 등록된 공지가 없습니다"
          }
        />
      ) : (
        <>
          <AdminNoticesTable
            notices={notices}
            deleteAction={deleteNotice}
            bulkDeleteAction={bulkDeleteNotices}
          />

          <Pagination
            currentPage={pageNum}
            totalPages={totalPages}
            basePath="/admin/notices"
            searchParams={{
              q: activeQuery || undefined,
              status: params.status || undefined,
              category: params.category || undefined,
            }}
          />
        </>
      )}
    </div>
  )
}
