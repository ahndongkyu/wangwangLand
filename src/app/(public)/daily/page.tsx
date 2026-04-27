import Link from "next/link"
import type { Metadata } from "next"
import { PenSquare, ImageIcon } from "lucide-react"

import { listDailyPosts } from "@/features/daily"
import { getCurrentProfile } from "@/features/members"
import { RoleBadge } from "@/shared/components/role-badge"
import { Pagination } from "@/shared/components/pagination"
import { SearchBox } from "@/shared/components/search-box"

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

  const [{ posts, total }, profile] = await Promise.all([
    listDailyPosts({ query: activeQuery || undefined, limit: PAGE_SIZE, offset }),
    getCurrentProfile(),
  ])

  const canWrite = profile?.status === "approved" && !profile.is_banned
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
          {canWrite && (
            <Link
              href="/daily/new"
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <PenSquare className="size-3.5" />
              작성하기
            </Link>
          )}
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
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {/* 헤더 */}
          <div className="grid grid-cols-[48px_1fr_auto_72px] gap-2 border-b border-border bg-secondary/40 px-4 py-2.5 text-xs font-semibold text-muted-foreground">
            <span className="text-center">번호</span>
            <span>제목</span>
            <span className="hidden sm:block">작성자</span>
            <span className="text-right">작성일</span>
          </div>
          <ul className="divide-y divide-border">
            {posts.map((post, i) => {
              const num = total - offset - i
              return (
                <li key={post.id}>
                  <Link
                    href={`/daily/${post.id}`}
                    className="grid grid-cols-[48px_1fr_auto_72px] items-center gap-2 px-4 py-3.5 transition-colors hover:bg-secondary/50"
                  >
                    <span className="text-center text-xs text-muted-foreground">{num}</span>
                    <span className="flex items-center gap-2 truncate">
                      <span className="truncate text-sm font-medium text-foreground">{post.title}</span>
                      {post.images.length > 0 && (
                        <ImageIcon className="size-3.5 shrink-0 text-muted-foreground/60" />
                      )}
                    </span>
                    <span className="hidden items-center gap-1.5 sm:flex">
                      {post.author && (
                        <>
                          <RoleBadge role={post.author.role} />
                          <span className="text-xs text-muted-foreground">{post.author.nickname}</span>
                        </>
                      )}
                    </span>
                    <span className="text-right text-xs text-muted-foreground">
                      {new Date(post.posted_at).toLocaleDateString("ko-KR", {
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
        basePath="/daily"
        searchParams={{ q: activeQuery || undefined }}
      />
    </div>
  )
}
