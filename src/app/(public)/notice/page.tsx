import type { Metadata } from "next"
import { Pin } from "lucide-react"

import { listNotices, MarkNoticesSeen } from "@/features/notices"
import { fetchCommentCounts } from "@/features/comments"
import { getCurrentProfile } from "@/features/members"
import { Pagination } from "@/shared/components/pagination"
import { SearchBox } from "@/shared/components/search-box"
import { ScrollRestorer } from "@/shared/components/scroll-restorer"
import { NoticeTypeBadge, stripNoticePrefix } from "@/features/notices/components/notice-type-badge"

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
  const noticesLastSeenAt = profile?.notices_last_seen_at ?? null

  const commentCounts = await fetchCommentCounts("notice", notices.map((n) => n.id))

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 md:px-6 md:py-16">
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
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <th className="px-4 py-3 text-left">제목</th>
                <th className="hidden sm:table-cell w-24 px-4 py-3 text-center whitespace-nowrap">작성자</th>
                <th className="w-20 px-4 py-3 text-center whitespace-nowrap">날짜</th>
                <th className="w-14 px-4 py-3 text-right whitespace-nowrap">조회</th>
              </tr>
            </thead>
            <tbody>
              {notices.map((n) => {
                const commentCount = commentCounts[n.id] ?? 0
                const isNew = noticesLastSeenAt
                  ? new Date(n.published_at ?? n.created_at) > new Date(noticesLastSeenAt)
                  : new Date(n.published_at ?? n.created_at) > new Date(Date.now() - 2 * 86400_000)

                return (
                  <tr
                    key={n.id}
                    className={`border-b border-border last:border-0 transition-colors hover:bg-secondary/30 ${
                      n.is_pinned ? "bg-primary/5" : ""
                    }`}
                  >
                    {/* 제목 */}
                    <td className="px-4 py-3">
                      <a href={`/notice/${n.id}`} className="flex items-start gap-2 group">
                        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                          {n.is_pinned && (
                            <Pin className="size-3 text-amber-500" />
                          )}
                          <NoticeTypeBadge title={n.title} />
                        </div>
                        <span className="font-medium text-foreground group-hover:underline line-clamp-1">
                          {stripNoticePrefix(n.title)}
                        </span>
                        {isNew && (
                          <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                            N
                          </span>
                        )}
                        {commentCount > 0 && (
                          <span className="shrink-0 text-xs text-primary font-semibold">
                            [{commentCount}]
                          </span>
                        )}
                      </a>
                    </td>

                    {/* 작성자 */}
                    <td className="hidden sm:table-cell px-4 py-3 text-xs text-muted-foreground whitespace-nowrap text-center">
                      {n.author?.nickname ?? "—"}
                    </td>

                    {/* 날짜 */}
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap text-center">
                      {new Date(n.published_at ?? n.created_at).toLocaleDateString("ko-KR", {
                        month: "2-digit",
                        day: "2-digit",
                      }).replace(/\.$/, "")}
                    </td>

                    {/* 조회 */}
                    <td className="px-4 py-3 text-xs text-muted-foreground text-right whitespace-nowrap">
                      {n.view_count.toLocaleString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
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
