import Link from "next/link"

import { listDonationThanks } from "@/features/thanks"
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

export default async function AdminThanksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const params = await searchParams
  const activeQuery = (params.q ?? "").trim()
  const pageNum = Math.max(1, Number(params.page ?? 1) || 1)
  const offset = (pageNum - 1) * PAGE_SIZE

  const { rows: posts, total } = await listDonationThanks({
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
            후원 감사글 관리
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            전체 <span className="font-semibold text-foreground">{total}</span>건 (임시저장 포함)
          </p>
        </div>
        <Link href="/admin/thanks/new" className={cn(buttonVariants())}>
          + 새 감사글 작성
        </Link>
      </header>

      <div className="mb-4 max-w-md">
        <SearchBox placeholder="제목으로 검색" />
      </div>

      {posts.length === 0 ? (
        <EmptyState
          title={
            activeQuery
              ? `'${activeQuery}' 검색 결과가 없습니다`
              : "아직 등록된 감사글이 없습니다"
          }
        />
      ) : (
        <>
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {posts.map((p) => {
              const isPublished = p.published_at !== null
              return (
                <li key={p.id}>
                  <PostListRow
                    href={`/admin/thanks/${p.id}/edit`}
                    title={p.title}
                    subTitle={p.donor_display_name ?? p.donation_summary ?? undefined}
                    thumbnail={p.images[p.thumbnail_index] ?? p.images[0] ?? null}
                    excerpt={excerpt(p.content)}
                    date={p.published_at ?? p.created_at}
                    viewCount={p.view_count}
                    statusBadge={
                      isPublished ? (
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
                </li>
              )
            })}
          </ul>

          <Pagination
            currentPage={pageNum}
            totalPages={totalPages}
            basePath="/admin/thanks"
            searchParams={{ q: activeQuery || undefined }}
          />
        </>
      )}
    </div>
  )
}
