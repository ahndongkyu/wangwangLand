import Link from "next/link"

import { getCurrentAdmin } from "@/features/auth"
import { listDailyPosts } from "@/features/daily"
import { Pagination } from "@/shared/components/pagination"
import { PostListRow } from "@/shared/components/post-list-row"
import { SearchBox } from "@/shared/components/search-box"
import { EmptyState } from "@/shared/components/empty-state"
import { buttonVariants } from "@/shared/components/ui/button"
import { cn, stripHtml } from "@/shared/lib/utils"

export const dynamic = "force-dynamic"

const PAGE_SIZE = 20

function excerpt(content: string | null | undefined, max = 80): string | null {
  if (!content) return null
  const plain = stripHtml(content)
  if (!plain) return null
  return plain.length > max ? plain.slice(0, max) + "…" : plain
}

export default async function AdminDailyPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const params = await searchParams
  const activeQuery = (params.q ?? "").trim()
  const pageNum = Math.max(1, Number(params.page ?? 1) || 1)
  const offset = (pageNum - 1) * PAGE_SIZE

  const [, { posts, total }] = await Promise.all([
    getCurrentAdmin(),
    listDailyPosts({
      query: activeQuery || undefined,
      limit: PAGE_SIZE,
      offset,
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">
            일상 관리
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            전체 <span className="font-semibold text-foreground">{total}</span>건
          </p>
        </div>
        <Link href="/admin/daily/new" className={cn(buttonVariants())}>
          + 새 일상 작성
        </Link>
      </header>

      <div className="mb-4 max-w-md">
        <SearchBox placeholder="제목으로 검색" />
      </div>

      {posts.length === 0 ? (
        <EmptyState title={activeQuery ? `'${activeQuery}' 검색 결과가 없습니다` : "아직 등록된 일상이 없습니다"} />
      ) : (
        <>
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {posts.map((p) => (
              <li key={p.id}>
                <PostListRow
                  href={`/admin/daily/${p.id}/edit`}
                  title={p.title}
                  thumbnail={p.images[0] ?? null}
                  excerpt={excerpt(p.content)}
                  author={p.author}
                  date={p.posted_at}
                  viewCount={p.view_count}
                />
              </li>
            ))}
          </ul>

          <Pagination
            currentPage={pageNum}
            totalPages={totalPages}
            basePath="/admin/daily"
            searchParams={{ q: activeQuery || undefined }}
          />
        </>
      )}
    </div>
  )
}
