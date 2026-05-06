import Link from "next/link"

import { listNotices } from "@/features/notices"
import { deleteNotice } from "@/features/notices/api/mutations"
import { Pagination } from "@/shared/components/pagination"
import { PostListRow } from "@/shared/components/post-list-row"
import { AdminPostActions } from "@/shared/components/admin-post-actions"
import { SearchBox } from "@/shared/components/search-box"
import { EmptyState } from "@/shared/components/empty-state"
import { buttonVariants } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"

export const dynamic = "force-dynamic"

const PAGE_SIZE = 20

export default async function AdminNoticesPage({
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
    query: activeQuery || undefined,
    limit: PAGE_SIZE,
    offset,
  })

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">
            공지사항 관리
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            전체 <span className="font-semibold text-foreground">{total}</span>건 (임시저장 포함)
          </p>
        </div>
        <Link href="/admin/notices/new" className={cn(buttonVariants())}>
          + 새 공지 작성
        </Link>
      </header>

      <div className="mb-4 max-w-md">
        <SearchBox placeholder="제목으로 검색" />
      </div>

      {notices.length === 0 ? (
        <EmptyState title={activeQuery ? `'${activeQuery}' 검색 결과가 없습니다` : "아직 등록된 공지가 없습니다"} />
      ) : (
        <>
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {notices.map((n) => (
              <li key={n.id} className="relative">
                <PostListRow
                  href={`/admin/notices/${n.id}/edit`}
                  title={n.title}
                  author={n.author}
                  date={n.created_at}
                  viewCount={n.view_count}
                  pinned={n.is_pinned}
                  statusBadge={
                    n.published_at ? (
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        공개
                      </span>
                    ) : (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        임시저장
                      </span>
                    )
                  }
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10">
                  <AdminPostActions
                    editHref={`/admin/notices/${n.id}/edit`}
                    deleteAction={deleteNotice.bind(null, n.id)}
                    label="공지"
                  />
                </div>
              </li>
            ))}
          </ul>

          <Pagination
            currentPage={pageNum}
            totalPages={totalPages}
            basePath="/admin/notices"
            searchParams={{ q: activeQuery || undefined }}
          />
        </>
      )}
    </div>
  )
}
