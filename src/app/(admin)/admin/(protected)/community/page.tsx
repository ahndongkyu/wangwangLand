import Link from "next/link"
import { listCommunityPosts } from "@/features/daily/api/community-queries"
import { COMMUNITY_TYPES, communityFilter } from "@/features/daily/lib/community-category"
import { Pagination } from "@/shared/components/pagination"
import { PostListRow } from "@/shared/components/post-list-row"
import { SearchBox } from "@/shared/components/search-box"
import { cn } from "@/shared/lib/utils"

export const dynamic = "force-dynamic"

export default async function CommunityManagement({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; category?: string }> }) {
  const params = await searchParams
  const query = (params.q ?? "").trim()
  const category = communityFilter(params.category)
  const requestedPage = Number(params.page ?? 1)
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const { posts, total } = await listCommunityPosts({ query: query || undefined, category, limit: 20, offset: (page - 1) * 20, includeDrafts: true })
  return <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
    <header className="mb-6 flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-bold">왕왕랜드 이야기 관리</h1><p className="mt-2 text-sm text-muted-foreground">전체 {total}건 · 일상·자유·후기·후원을 관리합니다.</p></div><Link href="/admin/daily/new" className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">이야기 작성</Link></header>
    <nav aria-label="이야기 관리 유형" className="mb-4 flex flex-wrap gap-2">{["전체", ...COMMUNITY_TYPES].map(type => <Link key={type} href={type === "전체" ? "/admin/community" : `/admin/community?category=${encodeURIComponent(type)}`} aria-current={(category ?? "전체") === type ? "page" : undefined} className={cn("inline-flex min-h-11 items-center rounded-full border px-4 text-sm", (category ?? "전체") === type ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-accent")}>{type}</Link>)}</nav>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-4"><SearchBox placeholder="제목으로 검색" className="max-w-sm" /><div className="flex flex-wrap gap-4 text-xs text-primary"><Link className="inline-flex min-h-11 items-center hover:underline" href="/admin/daily">일반 글 일괄 관리</Link><Link className="inline-flex min-h-11 items-center hover:underline" href="/admin/stories">기존 입양 후기 · 임시저장 관리</Link><Link className="inline-flex min-h-11 items-center hover:underline" href="/admin/thanks/new">공식 후원 감사글 작성</Link></div></div>
    <p className="mb-3 text-xs text-muted-foreground">일반 글은 게시일, 기존 입양 후기와 후원 감사글은 등록일 순입니다. 글을 누르면 수정 화면으로 이동합니다.</p>
    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">{posts.map(post => <PostListRow key={`${post.source}-${post.id}`} href={`/admin/${post.source === "story" ? "stories" : post.source === "thanks" ? "thanks" : "daily"}/${post.id}/edit`} title={post.title} badge={<span className="text-xs text-primary">{post.category}</span>} thumbnail={post.images[0]} date={post.date} author={post.author} viewCount={post.viewCount} statusBadge={<span className="text-xs text-muted-foreground">{post.draft ? "임시저장" : "공개"}</span>} />)}{!posts.length && <p className="p-12 text-center text-sm text-muted-foreground">해당하는 글이 없습니다.</p>}</div>
    <Pagination currentPage={page} totalPages={Math.max(1, Math.ceil(total / 20))} basePath="/admin/community" searchParams={{ q: query || undefined, category }} />
  </div>
}
