import type { Metadata } from "next"
import { Heart } from "lucide-react"

import { listDonationThanks, ThanksCard } from "@/features/thanks"
import { Pagination } from "@/shared/components/pagination"
import { SearchBox } from "@/shared/components/search-box"

export const metadata: Metadata = {
  title: "후원 감사",
  description: "왕왕랜드에 도착한 따뜻한 마음에 감사드립니다.",
}

export const revalidate = 60

const PAGE_SIZE = 20

export default async function ThanksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const params = await searchParams
  const activeQuery = (params.q ?? "").trim()
  const pageNum = Math.max(1, Number(params.page ?? 1) || 1)
  const offset = (pageNum - 1) * PAGE_SIZE

  const { rows: posts, total } = await listDonationThanks({
    query: activeQuery || undefined,
    limit: PAGE_SIZE,
    offset,
  })

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 md:px-6 md:py-16">
      <header className="mb-8">
        <h1 className="flex items-center gap-2 text-3xl font-bold text-foreground md:text-4xl">
          <Heart className="size-7 fill-primary/20 text-primary" aria-hidden />
          후원 감사
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          왕왕랜드에 도착한 따뜻한 마음을 기록합니다. 후원 한 번이 한 생명을 살립니다.
        </p>
      </header>

      <div className="mb-6 max-w-md">
        <SearchBox placeholder="제목으로 검색" />
      </div>

      {posts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          {activeQuery
            ? `'${activeQuery}' 검색 결과가 없습니다.`
            : "아직 등록된 감사글이 없습니다."}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {posts.map((p) => (
            <ThanksCard key={p.id} post={p} />
          ))}
        </div>
      )}

      <Pagination
        currentPage={pageNum}
        totalPages={totalPages}
        basePath="/thanks"
        searchParams={{ q: activeQuery || undefined }}
      />
    </div>
  )
}
