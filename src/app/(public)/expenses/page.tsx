import { BoardListRow as PostListRow, BoardListHeader } from "@/shared/components/board-list-row"
import type { Metadata } from "next"

import { listNotices } from "@/features/notices"
import { fetchCommentCounts } from "@/features/comments"
import { Pagination } from "@/shared/components/pagination"
import { SearchBox } from "@/shared/components/search-box"

export const metadata: Metadata = { title: "지출 내역" }
export const dynamic = "force-dynamic"
const PAGE_SIZE = 20

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const params = await searchParams
  const query = (params.q ?? "").trim()
  const page = Math.max(1, Number(params.page ?? 1) || 1)
  const { notices, total } = await listNotices({ boardType: "expense", publicOnly: true, query, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE })
  const counts = await fetchCommentCounts("notice", notices.map((post) => post.id))

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 md:px-6 md:py-16">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold md:text-4xl">지출 내역</h1>
          <p className="mt-2 text-muted-foreground">왕왕랜드의 월별 지출 내역을 확인하고 의견을 나눠주세요.</p>
        </div>
        <p className="text-sm text-muted-foreground">총 {total}건</p>
      </header>
      <div className="mb-5 max-w-sm"><SearchBox placeholder="제목으로 검색" /></div>
      {notices.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">{query ? "검색 결과가 없습니다." : "아직 공개된 지출 내역이 없습니다."}</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card"><BoardListHeader /><ul className="divide-y divide-border">
          {notices.map((post) => <li key={post.id}>
            <PostListRow category="지출" href={`/expenses/${post.id}`} title={post.title}
              author={post.author} date={post.published_at ?? post.created_at} viewCount={post.view_count ?? 0}
              commentCount={counts[post.id] ?? 0} attachmentCount={post.attachments?.length ?? 0}
              pinned={post.is_pinned} />
          </li>)}
        </ul></div>
      )}
      <Pagination currentPage={page} totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))} basePath="/expenses" searchParams={{ q: query || undefined }} />
    </div>
  )
}
