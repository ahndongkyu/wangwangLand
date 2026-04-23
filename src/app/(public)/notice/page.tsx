import Link from "next/link"
import type { Metadata } from "next"
import { Pin } from "lucide-react"

import { listNotices, MarkNoticesSeen } from "@/features/notices"
import { Pagination } from "@/shared/components/pagination"
import { SearchBox } from "@/shared/components/search-box"

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
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {/* 헤더 */}
          <div className="grid grid-cols-[56px_1fr_88px] border-b border-border bg-secondary/40 px-4 py-2.5 text-xs font-semibold text-muted-foreground">
            <span className="text-center">번호</span>
            <span>제목</span>
            <span className="text-right">작성일</span>
          </div>

          <ul className="divide-y divide-border">
            {notices.map((n, i) => {
              const num = total - offset - i
              return (
                <li
                  key={n.id}
                  className={n.is_pinned ? "bg-primary/5" : undefined}
                >
                  <Link
                    href={`/notice/${n.id}`}
                    className="grid grid-cols-[56px_1fr_88px] items-center px-4 py-3.5 transition-colors hover:bg-secondary/50"
                  >
                    {/* 번호 or 핀 */}
                    <span className="flex items-center justify-center text-xs text-muted-foreground">
                      {n.is_pinned ? (
                        <Pin className="size-3.5 text-primary" aria-label="상단 고정" />
                      ) : (
                        num
                      )}
                    </span>

                    {/* 제목 */}
                    <span className="truncate text-sm font-medium text-foreground">
                      {n.title}
                    </span>

                    {/* 날짜 */}
                    <span className="text-right text-xs text-muted-foreground">
                      {n.published_at &&
                        new Date(n.published_at).toLocaleDateString("ko-KR", {
                          month: "2-digit",
                          day: "2-digit",
                        })}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
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
