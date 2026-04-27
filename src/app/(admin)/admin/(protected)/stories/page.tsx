import Image from "next/image"
import Link from "next/link"

import { getCurrentAdmin } from "@/features/auth"
import { StoryRowActions, listAdoptionStories } from "@/features/stories"
import { Pagination } from "@/shared/components/pagination"
import { SearchBox } from "@/shared/components/search-box"
import { buttonVariants } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"

export const dynamic = "force-dynamic"

const PAGE_SIZE = 20

export default async function AdminStoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const params = await searchParams
  const activeQuery = (params.q ?? "").trim()
  const pageNum = Math.max(1, Number(params.page ?? 1) || 1)
  const offset = (pageNum - 1) * PAGE_SIZE

  const [me, { stories, total }] = await Promise.all([
    getCurrentAdmin(),
    listAdoptionStories({
      query: activeQuery || undefined,
      limit: PAGE_SIZE,
      offset,
      includeDrafts: true,
    }),
  ])
  const canDelete = !!me

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
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          {activeQuery
            ? `'${activeQuery}' 검색 결과가 없습니다.`
            : "아직 등록된 입양 후기가 없습니다."}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full min-w-[480px]">
              <thead className="border-b border-border bg-secondary/40 text-left text-sm">
                <tr>
                  <th className="px-4 py-3 font-semibold">사진</th>
                  <th className="px-4 py-3 font-semibold">제목</th>
                  <th className="hidden px-4 py-3 font-semibold md:table-cell">
                    연결된 아이
                  </th>
                  <th className="hidden px-4 py-3 font-semibold md:table-cell">
                    상태
                  </th>
                  <th className="hidden px-4 py-3 font-semibold md:table-cell">
                    작성자
                  </th>
                  <th className="hidden px-4 py-3 font-semibold md:table-cell">
                    작성일
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">작업</th>
                </tr>
              </thead>
              <tbody>
                {stories.map((s) => {
                  const cover = s.images[0]
                  const isPublished = s.published_at !== null
                  return (
                    <tr
                      key={s.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-4 py-3">
                        <div className="relative size-12 overflow-hidden rounded-md bg-muted">
                          {cover ? (
                            <Image
                              src={cover}
                              alt={s.title}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-lg">
                              💕
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">{s.title}</td>
                      <td className="hidden px-4 py-3 text-sm text-muted-foreground md:table-cell">
                        {s.dog ? (
                          <span className="flex items-center gap-1">
                            <img src="/images/icons/status/dog-happy.svg" alt="" className="size-4" />
                            {s.dog.name}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
                            isPublished
                              ? "bg-primary/15 text-primary"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {isPublished ? "공개" : "임시저장"}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 text-sm md:table-cell">
                        {s.author ? (
                          <span className="flex items-center gap-1">
                            <span>{s.author.nickname}</span>
                            {s.author.role !== "admin" && (
                              <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                유저
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="hidden px-4 py-3 text-sm text-muted-foreground md:table-cell">
                        {new Date(s.created_at).toLocaleDateString("ko-KR")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <StoryRowActions
                          id={s.id}
                          title={s.title}
                          canDelete={canDelete}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

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
