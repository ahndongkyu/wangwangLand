import type { Metadata } from "next"
import Link from "next/link"
import { listCommunityPosts } from "@/features/daily/api/community-queries"
import { COMMUNITY_TYPES, communityFilter } from "@/features/daily/lib/community-category"
import { fetchCommentCounts } from "@/features/comments"
import { getCurrentProfile } from "@/features/members"
import { MarkPageSeen } from "@/shared/components/mark-page-seen"
import { markDailySeenInDB } from "@/features/daily/api/mutations"
import { markStoriesSeenInDB } from "@/features/stories/api/mutations"
import { Pagination } from "@/shared/components/pagination"
import { PostListRow } from "@/shared/components/post-list-row"
import { SearchBox } from "@/shared/components/search-box"
import { WriteButton } from "@/shared/components/write-button"
import { ScrollRestorer } from "@/shared/components/scroll-restorer"
import { cn, stripHtml } from "@/shared/lib/utils"

export const metadata: Metadata = { title: "왕왕랜드 이야기", description: "일상부터 자유로운 이야기, 봉사와 입양 후기까지 함께 나눠요." }
export const revalidate = 60
const PAGE_SIZE = 20

export default async function DailyPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; category?: string }> }) {
  const params = await searchParams
  const query = (params.q ?? "").trim()
  const category = communityFilter(params.category)
  const requestedPage = Number(params.page ?? 1)
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const [{ posts, total }, profile] = await Promise.all([
    listCommunityPosts({ query: query || undefined, category, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    getCurrentProfile(),
  ])
  const [dailyCounts, storyCounts] = await Promise.all([
    fetchCommentCounts("daily", posts.filter(p => p.source === "daily").map(p => p.id)),
    fetchCommentCounts("story", posts.filter(p => p.source === "story").map(p => p.id)),
  ])
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 md:px-8 md:py-10">
      <ScrollRestorer />
      <MarkPageSeen isLoggedIn={!!profile} action={markDailySeenInDB} />
      {(!category || category === "후기") && <MarkPageSeen isLoggedIn={!!profile} action={markStoriesSeenInDB} />}
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div><p className="mb-2 text-xs font-medium text-primary">함께 나누는 이야기</p><h1 className="text-3xl font-bold tracking-tight">왕왕랜드 이야기</h1><p className="mt-2 text-sm text-muted-foreground">아이들 소식부터 봉사 후기까지, 편하게 이야기 나눠요.</p></div>
        <WriteButton href={`/daily/new?category=${encodeURIComponent(category ?? "일상")}`} label="글 남기기" />
      </header>
      <nav className="mb-5 flex flex-wrap gap-2" aria-label="이야기 유형">
        {["전체", ...COMMUNITY_TYPES].map(type => <Link key={type} href={type === "전체" ? "/daily" : `/daily?category=${encodeURIComponent(type)}`} aria-current={(category ?? "전체") === type ? "page" : undefined} className={cn("inline-flex min-h-11 items-center rounded-full border px-5 text-sm font-semibold transition-colors", (category ?? "전체") === type ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:bg-accent")}>{type}</Link>)}
      </nav>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4"><SearchBox placeholder="제목으로 검색" className="max-w-sm" /><p className="text-sm text-muted-foreground">총 {total}건</p></div>
      {posts.length ? <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">{posts.map(post => <li key={`${post.source}-${post.id}`}><PostListRow href={post.href} title={post.title} badge={<span className="text-xs font-semibold text-primary">{post.category}</span>} thumbnail={post.images[0] ?? null} excerpt={stripHtml(post.content ?? "").slice(0, 100)} author={post.author} date={post.date} viewCount={post.viewCount} commentCount={(post.source === "daily" ? dailyCounts : storyCounts)[post.id] ?? 0} newAfter={post.source === "daily" ? profile?.daily_last_seen_at : profile?.stories_last_seen_at} /></li>)}</ul> : <p className="rounded-xl border border-dashed border-border px-6 py-16 text-center text-muted-foreground">{query ? "검색 결과가 없습니다." : "아직 등록된 이야기가 없습니다."}</p>}
      <Pagination currentPage={page} totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))} basePath="/daily" searchParams={{ q: query || undefined, category }} />
    </div>
  )
}
