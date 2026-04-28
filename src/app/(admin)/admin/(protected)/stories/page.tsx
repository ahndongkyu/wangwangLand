import Link from "next/link"

import { getCurrentAdmin } from "@/features/auth"
import { listAdoptionStories } from "@/features/stories"
import { Pagination } from "@/shared/components/pagination"
import { SearchBox } from "@/shared/components/search-box"
import { EmptyState } from "@/shared/components/empty-state"
import { buttonVariants } from "@/shared/components/ui/button"
import { cn, formatShortDate } from "@/shared/lib/utils"

export const dynamic = "force-dynamic"

const PAGE_SIZE = 20

export default async function AdminStoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const params = await searchParams
  const activeQuery = (params.q ?? "").trim()
  const pageNum = Math.max(1, Number(params.page ?? 1) || 1)
  const offset = (pageNum - 1) * PAGE_SIZE

  const [, { stories, total }] = await Promise.all([
    getCurrentAdmin(),
    listAdoptionStories({
      query: activeQuery || undefined,
      limit: PAGE_SIZE,
      offset,
      includeDrafts: true,
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">
            입양 후기 관리
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            전체 <span className="font-semibold text-foreground">{total}</span>건
            (임시저장 포함)
          </p>
        </div>
        <Link href="/admin/stories/new" className={cn(buttonVariants())}>
          + 새 후기 작성
        </Link>
      </header>

      <div className="mb-4 max-w-md">
        <SearchBox placeholder="제목으로 검색" />
      </div>

      {stories.length === 0 ? (
        <EmptyState title={activeQuery ? `'${activeQuery}' 검색 결과가 없습니다` : "아직 등록된 입양 후기가 없습니다"} />
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="grid grid-cols-[56px_1fr_auto_90px_56px] gap-2 border-b border-border bg-secondary/40 px-4 py-2.5 text-xs font-semibold text-muted-foreground">
              <span className="text-center">번호</span>
              <span>제목</span>
              <span className="hidden sm:block">작성자</span>
              <span className="text-right">작성일</span>
              <span className="text-right">조회</span>
            </div>
            <ul className="divide-y divide-border">
              {stories.map((s, i) => {
                const num = total - offset - i
                const isPublished = s.published_at !== null
                return (
                  <li key={s.id}>
                    <Link
                      href={`/admin/stories/${s.id}/edit`}
                      className="grid grid-cols-[56px_1fr_auto_90px_56px] items-center gap-2 px-4 py-3.5 transition-colors hover:bg-secondary/50"
                    >
                      <span className="text-center text-xs text-muted-foreground">{num}</span>
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-sm font-medium text-foreground">{s.title}</span>
                        <span className="flex items-center gap-2">
                          {s.dog && (
                            <span className="text-[11px] text-primary/80">{s.dog.name}</span>
                          )}
                          <span className={`inline-flex rounded-full px-1.5 py-px text-[10px] font-semibold ${
                            isPublished ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                          }`}>
                            {isPublished ? "공개" : "임시저장"}
                          </span>
                        </span>
                      </span>
                      <span className="hidden text-xs text-muted-foreground sm:block">
                        {s.author?.nickname ?? "—"}
                      </span>
                      <span className="text-right text-xs text-muted-foreground">
                        {formatShortDate(s.created_at)}
                      </span>
                      <span className="text-right text-xs text-muted-foreground">
                        {s.view_count}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>

          <Pagination
            currentPage={pageNum}
            totalPages={totalPages}
            basePath="/admin/stories"
            searchParams={{ q: activeQuery || undefined }}
          />
        </>
      )}
    </div>
  )
}
