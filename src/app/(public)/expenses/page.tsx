import Link from "next/link"
import type { Metadata } from "next"
import { Paperclip } from "lucide-react"

import { listNotices } from "@/features/notices"
import { fetchCommentCounts } from "@/features/comments"
import { Pagination } from "@/shared/components/pagination"
import { SearchBox } from "@/shared/components/search-box"
import { formatShortDate } from "@/shared/lib/utils"

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
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-secondary/30 text-xs text-muted-foreground">
              <th className="px-4 py-3 text-left">제목</th><th className="hidden w-24 px-4 py-3 sm:table-cell">작성자</th><th className="w-16 px-3 py-3">날짜</th><th className="w-14 px-3 py-3 text-right">조회</th>
            </tr></thead>
            <tbody>{notices.map((post) => (
              <tr key={post.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                <td className="px-4 py-3">
                  <Link href={`/expenses/${post.id}`} className="flex min-w-0 items-center gap-1.5 hover:underline">
                    <span className="line-clamp-1 font-medium">{post.title}</span>
                    {(counts[post.id] ?? 0) > 0 && <span className="shrink-0 text-xs font-semibold text-primary">({counts[post.id]})</span>}
                    {post.attachments?.length > 0 && <Paperclip className="size-3.5 shrink-0 text-muted-foreground" aria-label="첨부파일 있음" />}
                  </Link>
                </td>
                <td className="hidden max-w-24 truncate px-4 py-3 text-center text-xs text-muted-foreground sm:table-cell">{post.author?.nickname ?? "왕왕랜드"}</td>
                <td className="px-3 py-3 text-center text-xs text-muted-foreground">{formatShortDate(post.published_at ?? post.created_at)}</td>
                <td className="px-3 py-3 text-right text-xs text-muted-foreground">{post.view_count ?? 0}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <Pagination currentPage={page} totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))} basePath="/expenses" searchParams={{ q: query || undefined }} />
    </div>
  )
}
