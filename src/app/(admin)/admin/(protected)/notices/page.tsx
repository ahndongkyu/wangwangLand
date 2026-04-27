import Link from "next/link"
import { Pin } from "lucide-react"

import { listNotices } from "@/features/notices"
import { Pagination } from "@/shared/components/pagination"
import { RoleBadge } from "@/shared/components/role-badge"
import { SearchBox } from "@/shared/components/search-box"
import { Badge } from "@/shared/components/ui/badge"
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
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          {activeQuery
            ? `'${activeQuery}' 검색 결과가 없습니다.`
            : "아직 등록된 공지가 없습니다."}
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="grid grid-cols-[56px_1fr_auto_auto_90px] gap-2 border-b border-border bg-secondary/40 px-4 py-2.5 text-xs font-semibold text-muted-foreground">
              <span className="text-center">번호</span>
              <span>제목</span>
              <span className="hidden sm:block">상태</span>
              <span className="hidden sm:block">작성자</span>
              <span className="text-right">발행일</span>
            </div>
            <ul className="divide-y divide-border">
              {notices.map((n, i) => {
                const num = total - offset - i
                return (
                  <li key={n.id}>
                    <Link
                      href={`/admin/notices/${n.id}/edit`}
                      className="grid grid-cols-[56px_1fr_auto_auto_90px] items-center gap-2 px-4 py-3.5 transition-colors hover:bg-secondary/50"
                    >
                      <span className="text-center text-xs text-muted-foreground">{num}</span>
                      <span className="flex min-w-0 items-center gap-2">
                        {n.is_pinned && (
                          <Pin className="size-3.5 shrink-0 text-primary" aria-label="상단고정" />
                        )}
                        <span className="truncate text-sm font-medium text-foreground">
                          {n.title}
                        </span>
                      </span>
                      <span className="hidden sm:block">
                        {n.published_at ? (
                          <Badge className="border-0 bg-primary/15 text-primary">
                            공개
                          </Badge>
                        ) : (
                          <Badge variant="secondary">임시저장</Badge>
                        )}
                      </span>
                      <span className="hidden items-center gap-1.5 sm:flex">
                        {n.author ? (
                          <>
                            <RoleBadge role={n.author.role} />
                            <span className="text-xs text-muted-foreground">{n.author.nickname}</span>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">운영진</span>
                        )}
                      </span>
                      <span className="text-right text-xs text-muted-foreground">
                        {n.published_at
                          ? new Date(n.published_at).toLocaleDateString("ko-KR", {
                              month: "2-digit",
                              day: "2-digit",
                            })
                          : "-"}
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
            basePath="/admin/notices"
            searchParams={{ q: activeQuery || undefined }}
          />
        </>
      )}
    </div>
  )
}
