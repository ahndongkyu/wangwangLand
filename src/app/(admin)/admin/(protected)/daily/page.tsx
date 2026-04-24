import Image from "next/image"
import Link from "next/link"

import { getCurrentAdmin } from "@/features/auth"
import { DailyRowActions, listDailyPosts } from "@/features/daily"
import { Pagination } from "@/shared/components/pagination"
import { SearchBox } from "@/shared/components/search-box"
import { buttonVariants } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"

export const dynamic = "force-dynamic"

const PAGE_SIZE = 20

export default async function AdminDailyPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const params = await searchParams
  const activeQuery = (params.q ?? "").trim()
  const pageNum = Math.max(1, Number(params.page ?? 1) || 1)
  const offset = (pageNum - 1) * PAGE_SIZE

  const [me, { posts, total }] = await Promise.all([
    getCurrentAdmin(),
    listDailyPosts({
      query: activeQuery || undefined,
      limit: PAGE_SIZE,
      offset,
    }),
  ])
  const canDelete = !!me

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
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          {activeQuery
            ? `'${activeQuery}' 검색 결과가 없습니다.`
            : "아직 등록된 일상이 없습니다."}
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full">
              <thead className="border-b border-border bg-secondary/40 text-left text-sm">
                <tr>
                  <th className="px-4 py-3 font-semibold">사진</th>
                  <th className="px-4 py-3 font-semibold">제목</th>
                  <th className="hidden px-4 py-3 font-semibold md:table-cell">
                    사진 수
                  </th>
                  <th className="hidden px-4 py-3 font-semibold md:table-cell">
                    날짜
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">작업</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((p) => {
                  const cover = p.images[0]
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-4 py-3">
                        <div className="relative size-12 overflow-hidden rounded-md bg-muted">
                          {cover ? (
                            <Image
                              src={cover}
                              alt={p.title}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-lg">
                              📷
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">{p.title}</td>
                      <td className="hidden px-4 py-3 text-sm text-muted-foreground md:table-cell">
                        {p.images.length}장
                      </td>
                      <td className="hidden px-4 py-3 text-sm text-muted-foreground md:table-cell">
                        {new Date(p.posted_at).toLocaleDateString("ko-KR")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DailyRowActions
                          id={p.id}
                          title={p.title}
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
            basePath="/admin/daily"
            searchParams={{ q: activeQuery || undefined }}
          />
        </>
      )}
    </div>
  )
}
