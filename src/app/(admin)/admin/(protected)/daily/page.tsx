import Link from "next/link"

import { listDailyPosts } from "@/features/daily"
import { deleteDailyPost, bulkDeleteDailyPosts } from "@/features/daily/api/mutations"
import { AdminDailyTable } from "@/features/daily/components/admin-daily-table"
import { Pagination } from "@/shared/components/pagination"
import { SearchBox } from "@/shared/components/search-box"
import { AdminFilterBar } from "@/shared/components/admin-filter-bar"
import { EmptyState } from "@/shared/components/empty-state"
import { buttonVariants } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"

export const dynamic = "force-dynamic"

const PAGE_SIZE = 20

const CATEGORY_FILTERS = [
  { label: "구조 소식", value: "구조 소식" },
  { label: "봉사 현장", value: "봉사 현장" },
  { label: "시설 안내", value: "시설 안내" },
]

export default async function AdminDailyPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; category?: string }>
}) {
  const params = await searchParams
  const activeQuery = (params.q ?? "").trim()
  const pageNum = Math.max(1, Number(params.page ?? 1) || 1)
  const offset = (pageNum - 1) * PAGE_SIZE

  const category = (params.category ?? "").trim() || undefined

  const { posts, total, publishedCount } = await listDailyPosts({
    query: activeQuery || undefined,
    limit: PAGE_SIZE,
    offset,
    category,
  })

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">일상 관리</h1>
          <div className="mt-1 flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">전체 {total}건</span>
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
              공개 {publishedCount}
            </span>
          </div>
        </div>
        <Link href="/admin/daily/new" className={cn(buttonVariants())}>
          + 새 일상 작성
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
          ]}
        />
      </div>

      {posts.length === 0 ? (
        <EmptyState
          title={
            activeQuery
              ? `'${activeQuery}' 검색 결과가 없습니다`
              : "아직 등록된 일상이 없습니다"
          }
        />
      ) : (
        <>
          <AdminDailyTable
            posts={posts}
            deleteAction={deleteDailyPost}
            bulkDeleteAction={bulkDeleteDailyPosts}
          />

          <Pagination
            currentPage={pageNum}
            totalPages={totalPages}
            basePath="/admin/daily"
            searchParams={{
              q: activeQuery || undefined,
              category: params.category || undefined,
            }}
          />
        </>
      )}
    </div>
  )
}
