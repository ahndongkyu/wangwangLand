import type { Metadata } from "next"
import Link from "next/link"

import { listDailyPosts } from "@/features/daily"
import { markDailySeenInDB } from "@/features/daily/api/mutations"
import { fetchCommentCounts } from "@/features/comments"
import { DailyCategoryBadge } from "@/features/daily/components/daily-category-badge"
import { getCurrentProfile } from "@/features/members"
import { MarkPageSeen } from "@/shared/components/mark-page-seen"
import { Pagination } from "@/shared/components/pagination"
import { PostListRow } from "@/shared/components/post-list-row"
import { SearchBox } from "@/shared/components/search-box"
import { WriteButton } from "@/shared/components/write-button"
import { ScrollRestorer } from "@/shared/components/scroll-restorer"
import { cn, stripHtml } from "@/shared/lib/utils"
import type { DailyCategory } from "@/shared/types/database"

function excerpt(content: string | null | undefined, max = 80): string | null {
  if (!content) return null
  const plain = stripHtml(content)
  if (!plain) return null
  return plain.length > max ? plain.slice(0, max) + "…" : plain
}

export const metadata: Metadata = {
  title: "일상",
  description: "왕왕랜드의 하루하루, 봉사 활동과 아이들 근황을 기록합니다.",
}

export const revalidate = 60

const PAGE_SIZE = 20
const BOARD_CATEGORIES: DailyCategory[] = ["일상", "자유게시판", "질문 및 답변"]
const FILTERABLE_CATEGORIES: DailyCategory[] = [
  ...BOARD_CATEGORIES,
  "구조 소식",
  "입소",
  "임시보호",
  "봉사 현장",
  "시설 안내",
  "후원 소식",
  "봉사 후기",
]

function isBoardCategory(value: string): value is DailyCategory {
  return FILTERABLE_CATEGORIES.some((category) => category === value)
}

export default async function DailyPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; category?: string }>
}) {
  const params = await searchParams
  const activeQuery = (params.q ?? "").trim()
  const requestedCategory = (params.category ?? "").trim()
  const activeCategory = isBoardCategory(requestedCategory)
    ? requestedCategory
    : "일상"
  const pageNum = Math.max(1, Number(params.page ?? 1) || 1)
  const offset = (pageNum - 1) * PAGE_SIZE

  const [{ posts, total }, profile] = await Promise.all([
    listDailyPosts({
      query: activeQuery || undefined,
      limit: PAGE_SIZE,
      offset,
      category: BOARD_CATEGORIES.includes(activeCategory)
        ? undefined
        : activeCategory,
      board:
        activeCategory === "일상"
          ? "daily"
          : activeCategory === "자유게시판"
            ? "free"
            : activeCategory === "질문 및 답변"
              ? "qna"
              : undefined,
    }),
    getCurrentProfile(),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const lastSeenAt = profile?.daily_last_seen_at ?? null

  const commentCounts = await fetchCommentCounts("daily", posts.map((p) => p.id))

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 md:px-6 md:py-16">
      <MarkPageSeen isLoggedIn={!!profile} action={markDailySeenInDB} />
      <ScrollRestorer />
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground md:text-4xl">
            {activeCategory}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {activeCategory === "자유게시판"
              ? "회원들과 편하게 이야기를 나누는 공간입니다."
              : activeCategory === "질문 및 답변"
                ? "궁금한 점을 묻고 서로의 경험을 나눠주세요."
                : "왕왕랜드에서 펼쳐지는 하루하루와 아이들 근황을 기록합니다."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            총 <span className="font-bold text-foreground">{total}</span>건
          </p>
          <WriteButton
            href={
              BOARD_CATEGORIES.includes(activeCategory)
                ? `/daily/new?category=${encodeURIComponent(activeCategory)}`
                : "/daily/new"
            }
          />
        </div>
      </header>

      <nav className="mb-5 flex flex-wrap gap-2" aria-label="게시판 선택">
        {BOARD_CATEGORIES.map((category) => (
          <Link
            key={category}
            href={`/daily?category=${encodeURIComponent(category)}`}
            className={cn(
              "rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
              activeCategory === category
                ? "border-primary/45 bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:border-brand-sage hover:bg-accent/60 hover:text-foreground"
            )}
          >
            {category}
          </Link>
        ))}
      </nav>

      <div className="mb-6 max-w-md">
        <SearchBox placeholder="제목으로 검색" />
      </div>

      {posts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          {activeQuery
            ? `'${activeQuery}' 검색 결과가 없습니다.`
            : `아직 등록된 ${activeCategory} 글이 없어요.`}
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {posts.map((post) => (
            <li key={post.id}>
              <PostListRow
                href={`/daily/${post.id}`}
                title={post.title}
                badge={<DailyCategoryBadge category={post.category} />}
                thumbnail={post.images[0] ?? null}
                excerpt={excerpt(post.content)}
                author={post.author}
                date={post.posted_at}
                viewCount={post.view_count}
                commentCount={commentCounts[post.id] ?? 0}
                newAfter={lastSeenAt}
                newWithinDays={lastSeenAt ? 0 : 2}
              />
            </li>
          ))}
        </ul>
      )}

      <Pagination
        currentPage={pageNum}
        totalPages={totalPages}
        basePath="/daily"
        searchParams={{
          q: activeQuery || undefined,
          category: activeCategory,
        }}
      />
    </div>
  )
}
