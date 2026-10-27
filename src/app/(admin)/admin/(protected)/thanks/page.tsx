import Link from "next/link"

import { listDonationThanks } from "@/features/thanks"
import { Pagination } from "@/shared/components/pagination"
import { AdminContentList } from "@/shared/components/admin-content-list"
import { deleteDonationThanks } from "@/features/thanks/api/mutations"
import { fetchAuthorMap } from "@/shared/lib/fetch-authors"
import { SearchBox } from "@/shared/components/search-box"
import { EmptyState } from "@/shared/components/empty-state"
import { buttonVariants } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"

export const dynamic = "force-dynamic"

const PAGE_SIZE = 20

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
  const authors = await fetchAuthorMap(posts.map(post => post.created_by))

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
          <AdminContentList deleteAction={deleteDonationThanks} rows={posts.map(post => ({
            id: post.id, title: post.title, href: `/admin/thanks/${post.id}/edit`, category: "후원",
            author: post.created_by ? authors[post.created_by]?.nickname ?? "—" : "—",
            date: post.created_at, views: post.view_count, status: post.published_at ? "공개" : "임시저장",
            detail: post.donor_display_name ?? post.donation_summary ?? undefined,
          }))} />

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
