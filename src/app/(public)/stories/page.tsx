import type { Metadata } from "next"

import { listAdoptionStories } from "@/features/stories"
import { markStoriesSeenInDB } from "@/features/stories/api/mutations"
import { fetchCommentCounts } from "@/features/comments"
import { getCurrentProfile } from "@/features/members"
import { MarkPageSeen } from "@/shared/components/mark-page-seen"
import { Pagination } from "@/shared/components/pagination"
import { PostListRow } from "@/shared/components/post-list-row"
import { SearchBox } from "@/shared/components/search-box"
import { WriteButton } from "@/shared/components/write-button"
import { ScrollRestorer } from "@/shared/components/scroll-restorer"
import { stripHtml } from "@/shared/lib/utils"

function excerpt(content: string | null | undefined, max = 80): string | null {
  if (!content) return null
  const plain = stripHtml(content)
  if (!plain) return null
  return plain.length > max ? plain.slice(0, max) + "…" : plain
}

export const metadata: Metadata = {
  title: "입양 후기",
  description: "새 가족을 만나 행복해진 아이들의 이야기를 만나보세요.",
}

export const revalidate = 60

const PAGE_SIZE = 20

export default async function StoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const params = await searchParams
  const activeQuery = (params.q ?? "").trim()
  const pageNum = Math.max(1, Number(params.page ?? 1) || 1)
  const offset = (pageNum - 1) * PAGE_SIZE

  const [{ stories, total }, profile] = await Promise.all([
    listAdoptionStories({ query: activeQuery || undefined, limit: PAGE_SIZE, offset }),
    getCurrentProfile(),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const lastSeenAt = profile?.stories_last_seen_at ?? null

  const commentCounts = await fetchCommentCounts("story", stories.map((s) => s.id))

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 md:px-6 md:py-16">
      <MarkPageSeen isLoggedIn={!!profile} action={markStoriesSeenInDB} />
      <ScrollRestorer />
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground md:text-4xl">
            입양 후기
          </h1>
          <p className="mt-2 text-muted-foreground">
            새 가족과 만나 따뜻한 사랑을 받고 있는 아이들의 이야기입니다.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            총 <span className="font-bold text-foreground">{total}</span>건
          </p>
          <WriteButton href="/stories/new" />
        </div>
      </header>

      <div className="mb-6 max-w-md">
        <SearchBox placeholder="제목으로 검색" />
      </div>

      {stories.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          {activeQuery
            ? `'${activeQuery}' 검색 결과가 없습니다.`
            : "아직 등록된 후기가 없어요. 첫 번째 행복한 이야기를 준비 중입니다 💕"}
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {stories.map((story) => {
            const dogThumb =
              story.dog?.images?.[story.dog.thumbnail_index] ??
              story.dog?.images?.[0] ??
              null
            const thumbnail = story.images[0] ?? dogThumb ?? null
            return (
              <li key={story.id}>
                <PostListRow
                  href={`/stories/${story.id}`}
                  title={story.title}
                  subTitle={story.dog ? story.dog.name : undefined}
                  thumbnail={thumbnail}
                  excerpt={excerpt(story.content)}
                  author={story.author}
                  date={story.published_at}
                  viewCount={story.view_count}
                  commentCount={commentCounts[story.id] ?? 0}
                  newAfter={lastSeenAt}
                  newWithinDays={lastSeenAt ? 0 : 2}
                />
              </li>
            )
          })}
        </ul>
      )}

      <Pagination
        currentPage={pageNum}
        totalPages={totalPages}
        basePath="/stories"
        searchParams={{ q: activeQuery || undefined }}
      />
    </div>
  )
}
