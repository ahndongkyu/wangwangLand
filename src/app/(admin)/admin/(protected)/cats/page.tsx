import Image from "next/image"
import Link from "next/link"

import { CatDeleteButton, listCatsWithCount } from "@/features/cats"
import { Pagination } from "@/shared/components/pagination"
import { SearchBox } from "@/shared/components/search-box"
import { Badge } from "@/shared/components/ui/badge"
import { buttonVariants } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"

export const dynamic = "force-dynamic"

const PAGE_SIZE = 20

export default async function AdminCatsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const params = await searchParams
  const activeQuery = (params.q ?? "").trim()
  const pageNum = Math.max(1, Number(params.page ?? 1) || 1)
  const offset = (pageNum - 1) * PAGE_SIZE

  const { cats, total } = await listCatsWithCount({
    status: "전체",
    query: activeQuery || undefined,
    limit: PAGE_SIZE,
    offset,
  })

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const startIdx = offset + 1
  const endIdx = offset + cats.length

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">
            고양이 관리
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeQuery && `'${activeQuery}' 검색 결과 `}
            전체 <span className="font-semibold text-foreground">{total}</span>마리
            {total > 0 && (
              <>
                {" "}· {startIdx}~{endIdx} 표시
              </>
            )}
          </p>
        </div>
        <Link href="/admin/cats/new" className={cn(buttonVariants())}>
          + 새 아이 등록
        </Link>
      </header>

      <div className="mb-4 max-w-md">
        <SearchBox placeholder="이름으로 검색" />
      </div>

      {cats.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          {activeQuery
            ? `'${activeQuery}' 검색 결과가 없습니다.`
            : "아직 등록된 고양이가 없습니다. 위 버튼을 눌러 첫 아이를 등록해 보세요."}
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full">
              <thead className="border-b border-border bg-secondary/40 text-left text-sm">
                <tr>
                  <th className="px-4 py-3 font-semibold">사진</th>
                  <th className="px-4 py-3 font-semibold">이름</th>
                  <th className="hidden px-4 py-3 font-semibold md:table-cell">
                    품종
                  </th>
                  <th className="px-4 py-3 font-semibold">상태</th>
                  <th className="hidden px-4 py-3 font-semibold lg:table-cell">
                    위치
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">작업</th>
                </tr>
              </thead>
              <tbody>
                {cats.map((cat) => {
                  const thumb = cat.images[cat.thumbnail_index] ?? cat.images[0]
                  return (
                    <tr
                      key={cat.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-4 py-3">
                        <div className="relative size-12 overflow-hidden rounded-md bg-muted">
                          {thumb ? (
                            <Image
                              src={thumb}
                              alt={cat.name}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-lg">
                              🐱
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">{cat.name}</td>
                      <td className="hidden px-4 py-3 text-sm text-muted-foreground md:table-cell">
                        {cat.breed ?? "-"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">{cat.status}</Badge>
                      </td>
                      <td className="hidden px-4 py-3 text-sm text-muted-foreground lg:table-cell">
                        {cat.kennel_location ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Link
                            href={`/admin/cats/${cat.id}/edit`}
                            className={cn(
                              buttonVariants({ variant: "ghost", size: "sm" })
                            )}
                          >
                            수정
                          </Link>
                          <CatDeleteButton id={cat.id} name={cat.name} />
                        </div>
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
            basePath="/admin/cats"
            searchParams={{ q: activeQuery || undefined }}
          />
        </>
      )}
    </div>
  )
}
