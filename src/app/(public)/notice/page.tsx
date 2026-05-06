import type { Metadata } from "next"

import { listNotices, MarkNoticesSeen } from "@/features/notices"
import { Pagination } from "@/shared/components/pagination"
import { PostListRow } from "@/shared/components/post-list-row"
import { SearchBox } from "@/shared/components/search-box"
import { ScrollRestorer } from "@/shared/components/scroll-restorer"

export const metadata: Metadata = {
  title: "공지사항",
}

export const revalidate = 60

const PAGE_SIZE = 20

export default async function NoticePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const params = await searchParams
  const activeQuery = (params.q ?? "").trim()
  const pageNum = Math.max(1, Number(params.page ?? 1) || 1)
  const offset = (pageNum - 1) * PAGE_SIZE

  const { notices, total } = await listNotices({
    query: activeQuery || undefined,
    limit: PAGE_SIZE,
    offset,
  })
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 md:px-6 md:py-16">
      <MarkNoticesSeen />
      <ScrollRestorer />
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground md:text-4xl">
            공지사항
          </h1>
          <p className="mt-2 text-muted-foreground">
            왕왕랜드의 소식과 안내를 확인해 주세요.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          총 <span className="font-bold text-foreground">{total}</span>건
        </p>
      </header>

      <div className="mb-6 max-w-md">
        <SearchBox placeholder="제목으로 검색" />
      </div>

      {notices.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          {activeQuery
            ? `'${activeQuery}' 검색 결과가 없습니다.`
            : "아직 등록된 공지가 없어요."}
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {notices.map((n) => (
            <li key={n.id} className={n.is_pinned ? "bg-primary/5" : undefined}>
              <PostListRow
                href={`/notice/${n.id}`}
                title={n.title}
                date={n.published_at}
                viewCount={n.view_count}
                pinned={n.is_pinned}
                newWithinDays={2}
              />
            </li>
          ))}
        </ul>
      )}

      <Pagination
        currentPage={pageNum}
        totalPages={totalPages}
        basePath="/notice"
        searchParams={{ q: activeQuery || undefined }}
      />
    </div>
  )
}
