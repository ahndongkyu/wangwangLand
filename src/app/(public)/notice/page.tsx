import { BoardListRow as PostListRow, BoardListHeader } from "@/shared/components/board-list-row"
import type { Metadata } from "next"

import { listNotices, MarkNoticesSeen } from "@/features/notices"
import { fetchCommentCounts } from "@/features/comments"
import { getCurrentProfile } from "@/features/members"
import { Pagination } from "@/shared/components/pagination"
import { SearchBox } from "@/shared/components/search-box"
import { ScrollRestorer } from "@/shared/components/scroll-restorer"
import { parseNoticePrefix, stripNoticePrefix } from "@/features/notices/components/notice-type-badge"

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

  const [{ notices, total }, profile] = await Promise.all([
    listNotices({
      query: activeQuery || undefined,
      limit: PAGE_SIZE,
      offset,
    }),
    getCurrentProfile(),
  ])
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const isLoggedIn = !!profile
  // 서버 응답 생성 시점을 기준으로 비회원에게 최근 이틀의 새 글을 표시한다.
  // eslint-disable-next-line react-hooks/purity
  const noticesLastSeenAt = profile?.notices_last_seen_at ?? new Date(Date.now() - 2 * 86400000).toISOString()

  const commentCounts = await fetchCommentCounts("notice", notices.map((n) => n.id))

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 md:px-6 md:py-16">
      <MarkNoticesSeen isLoggedIn={isLoggedIn} />
      <ScrollRestorer />

      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground md:text-4xl">공지사항</h1>
          <p className="mt-2 text-muted-foreground">왕왕랜드의 소식과 안내를 확인해 주세요.</p>
        </div>
        <p className="text-sm text-muted-foreground">
          총 <span className="font-bold text-foreground">{total}</span>건
        </p>
      </header>

      <div className="mb-5 max-w-sm">
        <SearchBox placeholder="제목으로 검색" />
      </div>

      {notices.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          {activeQuery ? `'${activeQuery}' 검색 결과가 없습니다.` : "아직 등록된 공지가 없어요."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card"><BoardListHeader /><ul className="divide-y divide-border">
          {notices.map((post) => <li key={post.id}>
            <PostListRow href={`/notice/${post.id}`} title={stripNoticePrefix(post.title)}
              author={post.author} date={post.published_at ?? post.created_at} viewCount={post.view_count ?? 0}
              commentCount={commentCounts[post.id] ?? 0} attachmentCount={post.attachments?.length ?? 0}
              pinned={post.is_pinned} category={parseNoticePrefix(post.title) ?? "공지"} newAfter={noticesLastSeenAt} />
          </li>)}
        </ul></div>
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
