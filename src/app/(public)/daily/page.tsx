import type { Metadata } from "next"

import { listDailyPosts } from "@/features/daily"
import { Pagination } from "@/shared/components/pagination"
import { PostListRow } from "@/shared/components/post-list-row"
import { SearchBox } from "@/shared/components/search-box"
import { WriteButton } from "@/shared/components/write-button"

function excerpt(content: string | null | undefined, max = 80): string | null {
  if (!content) return null
  // 마크다운/줄바꿈 정리
  const plain = content.replace(/\s+/g, " ").trim()
  if (!plain) return null
  return plain.length > max ? plain.slice(0, max) + "…" : plain
}

export const metadata: Metadata = {
  title: "왕왕랜드 일상",
  description: "왕왕랜드의 하루하루, 봉사 활동과 아이들 근황을 기록합니다.",
}

export const revalidate = 60

const PAGE_SIZE = 20

export default async function DailyPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const params = await searchParams
  const activeQuery = (params.q ?? "").trim()
  const pageNum = Math.max(1, Number(params.page ?? 1) || 1)
  const offset = (pageNum - 1) * PAGE_SIZE

  const { posts, total } = await listDailyPosts({
    query: activeQuery || undefined,
    limit: PAGE_SIZE,
    offset,
  })

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 md:px-6 md:py-16">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground md:text-4xl">
            왕왕랜드 일상
          </h1>
          <p className="mt-2 text-muted-foreground">
            왕왕랜드에서 펼쳐지는 하루하루, 봉사 활동과 아이들 근황을 기록합니다.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            총 <span className="font-bold text-foreground">{total}</span>건
          </p>
          <WriteButton href="/daily/new" />
        </div>
      </header>

      <div className="mb-6 max-w-md">
        <SearchBox placeholder="제목으로 검색" />
      </div>

      {posts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          {activeQuery
            ? `'${activeQuery}' 검색 결과가 없습니다.`
            : "아직 등록된 일상이 없어요. 곧 따뜻한 순간들을 공유할게요 📷"}
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {posts.map((post) => (
            <li key={post.id}>
              <PostListRow
                href={`/daily/${post.id}`}
                title={post.title}
                thumbnail={post.images[0] ?? null}
                excerpt={excerpt(post.content)}
                author={post.author}
                date={post.posted_at}
                viewCount={post.view_count}
                newWithinDays={1}
              />
            </li>
          ))}
        </ul>
      )}

      <Pagination
        currentPage={pageNum}
        totalPages={totalPages}
        basePath="/daily"
        searchParams={{ q: activeQuery || undefined }}
      />
    </div>
  )
}
