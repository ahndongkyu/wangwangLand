import Link from "next/link"

import { listNotices } from "@/features/notices"
import { bulkDeleteNotices, deleteNotice } from "@/features/notices/api/mutations"
import { AdminNoticesTable } from "@/features/notices/components/admin-notices-table"
import { EmptyState } from "@/shared/components/empty-state"
import { Pagination } from "@/shared/components/pagination"
import { SearchBox } from "@/shared/components/search-box"
import { buttonVariants } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"

export const dynamic = "force-dynamic"

const PAGE_SIZE = 20

async function deleteExpense(id: string) {
  "use server"
  return deleteNotice(id, "expense")
}

async function bulkDeleteExpenses(ids: string[]) {
  "use server"
  return bulkDeleteNotices(ids, "expense")
}

export default async function AdminExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const params = await searchParams
  const activeQuery = (params.q ?? "").trim()
  const pageNum = Math.max(1, Number(params.page ?? 1) || 1)
  const offset = (pageNum - 1) * PAGE_SIZE
  const { notices, total } = await listNotices({
    includeDrafts: true,
    boardType: "expense",
    query: activeQuery || undefined,
    limit: PAGE_SIZE,
    offset,
  })
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">지출 내역 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">월별 지출·소비 내역과 첨부파일을 운영진 내부에서 관리합니다. 전체 {total}건</p>
        </div>
        <Link href="/admin/expenses/new" className={cn(buttonVariants())}>새 지출 내역 작성</Link>
      </header>

      <div className="mb-4">
        <SearchBox placeholder="제목으로 검색" className="max-w-64" />
      </div>

      {notices.length === 0 ? (
        <EmptyState title={activeQuery ? `'${activeQuery}' 검색 결과가 없습니다` : "아직 등록된 지출 내역이 없습니다"} />
      ) : (
        <>
          <AdminNoticesTable
            notices={notices}
            boardType="expense"
            deleteAction={deleteExpense}
            bulkDeleteAction={bulkDeleteExpenses}
          />
          <Pagination currentPage={pageNum} totalPages={totalPages} basePath="/admin/expenses" searchParams={{ q: activeQuery || undefined }} />
        </>
      )}
    </div>
  )
}
