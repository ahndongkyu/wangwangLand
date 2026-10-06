import type { Metadata } from "next"
import Link from "next/link"
import { DogGrid, listDogsWithCount } from "@/features/dogs"
import type { DogSort } from "@/features/dogs/api/queries"
import { Pagination } from "@/shared/components/pagination"
import { cn } from "@/shared/lib/utils"
import type { DogSize, DogStatus } from "@/shared/types/database"

export const metadata: Metadata = { title: "가족을 기다리는 아이들", description: "왕왕랜드에서 새 가족을 기다리는 아이들을 만나보세요." }
export const revalidate = 60
const PAGE_SIZE = 24
const statuses = [
  { label: "입양 대기", value: "waiting" },
  { label: "임시보호 중", value: "임시보호중" },
  { label: "입양 완료", value: "입양완료" },
  { label: "전체", value: "전체" },
]
const sizes: DogSize[] = ["소", "중소", "중", "중대", "대", "대대"]
const field = "h-11 min-w-0 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

export default async function DogsPage({ searchParams }: { searchParams: Promise<{ status?: string; size?: string; sort?: string; q?: string; page?: string }> }) {
  const params = await searchParams
  const status = [...statuses.map(s => s.value), "보호중"].includes(params.status ?? "") ? params.status! : "waiting"
  const size = sizes.includes(params.size as DogSize) ? params.size as DogSize : undefined
  const sort: DogSort = params.sort === "name" ? "name" : "latest"
  const q = (params.q ?? "").trim()
  const page = Math.max(1, Math.floor(Number(params.page) || 1))
  const { dogs, total } = await listDogsWithCount({ adoptableOnly: status === "waiting", status: status === "waiting" ? undefined : status as DogStatus | "전체", size, sort, query: q || undefined, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE })
  const filters = { status, size, sort, q: q || undefined }
  function statusHref(value: string) {
    const query = new URLSearchParams({ status: value, sort })
    if (size) query.set("size", size)
    if (q) query.set("q", q)
    return `/dogs?${query}`
  }
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 md:py-12">
      <header className="mb-7">
        <p className="mb-3 text-xs font-semibold tracking-wider text-primary">아이들 만나기</p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-4xl">가족을 기다리는 아이들</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">서로를 알아가는 첫 만남. 사진을 눌러 아이의 이야기를 만나보세요.</p>
      </header>
      <nav aria-label="아이들 상태" className="mb-5 grid grid-cols-4 border-b border-border sm:flex sm:gap-1">
        {statuses.map(item => <Link key={item.value} href={statusHref(item.value)} aria-current={status === item.value ? "page" : undefined} className={cn("flex min-h-12 items-center justify-center border-b-2 px-1 text-xs transition-colors sm:px-4 sm:text-sm", status === item.value ? "border-primary font-semibold text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>{item.label}</Link>)}
      </nav>
      <form action="/dogs" className="mb-7 grid grid-cols-2 items-end gap-3 rounded-xl border border-border bg-card p-4 lg:grid-cols-[minmax(0,1fr)_7rem_9rem_auto]">
        <input type="hidden" name="status" value={status} />
        <label className="col-span-2 grid gap-2 text-xs font-medium text-muted-foreground lg:col-span-1">이름·품종 검색<input name="q" defaultValue={q} placeholder="어떤 아이를 찾으세요?" className={field} /></label>
        <label className="grid gap-2 text-xs font-medium text-muted-foreground">크기<select name="size" defaultValue={size ?? ""} className={field}><option value="">모든 크기</option>{sizes.map(s => <option key={s} value={s}>{s}형</option>)}</select></label>
        <label className="grid gap-2 text-xs font-medium text-muted-foreground">정렬<select name="sort" defaultValue={sort} className={field}><option value="latest">최근 소식순</option><option value="name">이름순</option></select></label>
        <button className="col-span-2 min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 lg:col-span-1">찾아보기</button>
      </form>
      <DogGrid dogs={dogs} emptyMessage="조건에 맞는 아이가 없어요. 검색어나 크기를 바꿔보세요." />
      {dogs.length === 0 && <Link href="/dogs" className="mt-4 inline-flex min-h-11 items-center text-sm text-primary hover:underline">검색 조건 초기화</Link>}
      <Pagination currentPage={page} totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))} basePath="/dogs" searchParams={filters} />
    </div>
  )
}
