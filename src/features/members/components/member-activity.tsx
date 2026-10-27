import Link from "next/link"
import { COMMUNITY_TYPES, type CommunityType } from "@/features/daily/lib/community-category"
import type { MemberActivity } from "../api/activity"
import { ADMIN_LIST } from "@/shared/lib/admin-list"
import { cn, formatShortDate } from "@/shared/lib/utils"

export function MemberActivitySection({ activity, memberId, category, returnHref }: {
  activity: MemberActivity | null; memberId: string; category?: CommunityType; returnHref: string
}) {
  const href = (type?: CommunityType, page = 1) => {
    const query = new URLSearchParams({ returnTo: returnHref })
    if (type) query.set("activityType", type)
    if (page > 1) query.set("activityPage", String(page))
    return `/admin/members/${encodeURIComponent(memberId)}?${query}#member-activity`
  }
  return <section id="member-activity" className="min-w-0 scroll-mt-24" aria-labelledby="member-activity-title">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2 id="member-activity-title" className="text-base font-semibold">작성한 이야기</h2>
      {activity && <span className="text-xs text-muted-foreground">{category ?? "전체"} {activity.filteredTotal.toLocaleString()}건 · 최신순</span>}
    </div>
    <nav aria-label="회원 이야기 유형" className="mb-3 flex flex-wrap gap-2">
      {["전체", ...COMMUNITY_TYPES].map(type => <Link key={type} href={href(type === "전체" ? undefined : type as CommunityType)}
        aria-current={(category ?? "전체") === type ? "page" : undefined}
        className={cn("inline-flex min-h-11 items-center rounded-lg border px-3 text-sm transition-colors", (category ?? "전체") === type ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-primary/5")}>{type}</Link>)}
    </nav>
    {!activity ? <div role="alert" className="rounded-xl border border-destructive/30 bg-card p-4 text-sm">
      <p>작성한 이야기를 불러오지 못했습니다. 활동이 없다는 뜻은 아닙니다.</p>
      <Link href={href(category)} className="mt-2 inline-flex min-h-11 items-center text-primary underline">다시 확인</Link>
    </div> : activity.posts.length === 0 ? <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">{category ? `${category} 유형으로 작성한 글이 없습니다.` : "작성한 이야기가 없습니다."}</p> : <>
      <div className={ADMIN_LIST.surface}>
        <div aria-hidden className={cn(ADMIN_LIST.header, "hidden grid-cols-[44px_minmax(0,1fr)_64px_70px] gap-3 sm:grid")}><span>유형</span><span>제목</span><span className="text-center">상태</span><span className="text-right">날짜</span></div>
        <ul className="divide-y divide-border">{activity.posts.map(post => <li key={`${post.source}:${post.id}`}>
          <Link href={post.href} className={cn(ADMIN_LIST.row, "grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5 sm:grid-cols-[44px_minmax(0,1fr)_64px_70px] sm:items-center")}>
            <span className="text-xs text-muted-foreground">{post.category}</span>
            <span title={post.title} className="col-span-2 row-start-2 truncate font-medium sm:col-span-1 sm:row-start-auto">{post.title}</span>
            <span className={cn("col-start-2 row-start-1 text-right text-xs sm:col-start-auto sm:row-start-auto sm:text-center", post.draft ? "text-primary" : "text-muted-foreground")}>{post.draft ? "임시저장" : "공개"}</span>
            <time dateTime={post.date} className="col-span-2 text-xs tabular-nums text-muted-foreground sm:col-span-1 sm:text-right">{formatShortDate(post.date)}</time>
          </Link>
        </li>)}</ul>
      </div>
      {activity.totalPages > 1 && <nav aria-label="회원 이야기 페이지" className="mt-3 flex items-center justify-between gap-3 text-sm">
        {activity.page > 1 ? <Link className="inline-flex min-h-11 items-center rounded-lg border border-border bg-card px-4 hover:bg-primary/5" href={href(category, activity.page - 1)}>이전</Link> : <span aria-disabled="true" className="px-4 text-muted-foreground">이전</span>}
        <span className="tabular-nums">{activity.page} / {activity.totalPages}</span>
        {activity.page < activity.totalPages ? <Link className="inline-flex min-h-11 items-center rounded-lg border border-border bg-card px-4 hover:bg-primary/5" href={href(category, activity.page + 1)}>다음</Link> : <span aria-disabled="true" className="px-4 text-muted-foreground">다음</span>}
      </nav>}
    </>}
    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">이 회원이 작성한 글만 표시합니다. 일반 글은 게시일, 기존 후기·후원 감사글은 등록일 기준이며 임시저장도 포함합니다.</p>
  </section>
}
