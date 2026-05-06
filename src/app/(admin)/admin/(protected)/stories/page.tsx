import Link from "next/link"

import { getCurrentAdmin } from "@/features/auth"
import { listAdoptionStories } from "@/features/stories"
import { deleteAdoptionStory } from "@/features/stories/api/mutations"
import { Pagination } from "@/shared/components/pagination"
import { PostListRow } from "@/shared/components/post-list-row"
import { AdminPostActions } from "@/shared/components/admin-post-actions"
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
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {stories.map((s) => {
              const dogThumb =
                s.dog?.images?.[s.dog.thumbnail_index] ??
                s.dog?.images?.[0] ??
                null
              const thumbnail = s.images[0] ?? dogThumb ?? null
              const isPublished = s.published_at !== null
              return (
                <li key={s.id} className="relative">
                  <PostListRow
                    href={`/admin/stories/${s.id}/edit`}
                    title={s.title}
                    subTitle={s.dog ? `${s.dog.name} 입양 후기` : undefined}
                    thumbnail={thumbnail}
                    excerpt={excerpt(s.content)}
                    author={s.author}
                    date={s.created_at}
                    viewCount={s.view_count}
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
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10">
                    <AdminPostActions
                      editHref={`/admin/stories/${s.id}/edit`}
                      deleteAction={deleteAdoptionStory.bind(null, s.id)}
                      label="후기"
                    />
                  </div>
                </li>
              )
            })}
          </ul>

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
