import Link from "next/link"
import type { Metadata } from "next"
import { PenSquare, ImageIcon } from "lucide-react"

import { listAdoptionStories } from "@/features/stories"
import { getCurrentProfile } from "@/features/members"
import { RoleBadge } from "@/shared/components/role-badge"
import { Pagination } from "@/shared/components/pagination"
import { SearchBox } from "@/shared/components/search-box"

export const metadata: Metadata = {
  title: "입양 후기",
  description: "새 가족을 만나 행복해진 아이들의 이야기를 만나보세요.",
}

export const revalidate = 60

const PAGE_SIZE = 12

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

  const canWrite = profile?.status === "approved" && !profile.is_banned
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
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
          {canWrite && (
            <Link
              href="/stories/new"
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <PenSquare className="size-3.5" />
              작성하기
            </Link>
          )}
        </div>
      </header>

      <div className="mb-8 max-w-md">
        <SearchBox placeholder="제목으로 검색" />
      </div>

      {stories.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          {activeQuery
            ? `'${activeQuery}' 검색 결과가 없습니다.`
            : "아직 등록된 후기가 없어요. 첫 번째 행복한 이야기를 준비 중입니다 💕"}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {/* 헤더 */}
          <div className="grid grid-cols-[56px_1fr_auto_80px] gap-2 border-b border-border bg-secondary/40 px-4 py-2.5 text-xs font-semibold text-muted-foreground">
            <span className="text-center">번호</span>
            <span>제목</span>
            <span className="hidden sm:block">작성자</span>
            <span className="text-right">작성일</span>
          </div>
          <ul className="divide-y divide-border">
            {stories.map((story, i) => {
              const num = total - offset - i
              return (
                <li key={story.id}>
                  <Link
                    href={`/stories/${story.id}`}
                    className="grid grid-cols-[56px_1fr_auto_80px] items-center gap-2 px-4 py-3.5 transition-colors hover:bg-secondary/50"
                  >
                    <span className="text-center text-xs text-muted-foreground">{num}</span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="flex items-center gap-2 truncate">
                        <span className="truncate text-sm font-medium text-foreground">{story.title}</span>
                        {story.images.length > 0 && (
                          <ImageIcon className="size-3.5 shrink-0 text-muted-foreground/60" />
                        )}
                      </span>
                      {story.dog && (
                        <span className="text-xs text-primary/80">{story.dog.name}</span>
                      )}
                    </span>
                    <span className="hidden items-center gap-1.5 sm:flex">
                      {story.author && (
                        <>
                          <RoleBadge role={story.author.role} />
                          <span className="text-xs text-muted-foreground">{story.author.nickname}</span>
                        </>
                      )}
                    </span>
                    <span className="text-right text-xs text-muted-foreground">
                      {story.published_at &&
                        new Date(story.published_at).toLocaleDateString("ko-KR", {
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
        basePath="/stories"
        searchParams={{ q: activeQuery || undefined }}
      />
    </div>
  )
}
