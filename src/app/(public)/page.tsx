import Image from "next/image"
import Link from "next/link"
import { ChevronRight, Eye, PenLine } from "lucide-react"

import { fetchCommentCounts } from "@/features/comments"
import { listCommunityPosts } from "@/features/daily/api/community-queries"
import { PostListRow } from "@/shared/components/post-list-row"
import { stripHtml } from "@/shared/lib/utils"
import { listDogsForHome } from "@/features/dogs"
import { getCurrentProfile } from "@/features/members"
import { listEventsInRange, MonthGrid, MonthNav } from "@/features/events"
import { monthRange, todayKst, yearMonthKst } from "@/features/events/lib/date"
import { listNotices } from "@/features/notices"
import { BrandIcon } from "@/shared/components/brand-icon"
import { CopyButton } from "@/shared/components/copy-button"
import { SITE } from "@/shared/constants/site"
import { formatAge } from "@/shared/lib/age"
import type { Dog } from "@/shared/types/database"

export const revalidate = 60

const RECENT_POST_COUNT = 5
const YM_RE = /^\d{4}-(0[1-9]|1[0-2])$/

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string }>
}) {
  const params = await searchParams
  const scheduleYearMonth =
    params.ym && YM_RE.test(params.ym)
      ? params.ym
      : yearMonthKst(todayKst())
  const scheduleRange = monthRange(scheduleYearMonth)

  const [dogs, noticeResult, dailyResult, scheduleEvents, expenseResult, profile] = await Promise.all([
    listDogsForHome(4),
    listNotices({ limit: RECENT_POST_COUNT }),
    listCommunityPosts({ limit: 3 }),
    listEventsInRange({
      from: scheduleRange.from,
      to: scheduleRange.to,
      categories: ["volunteer", "regular_volunteer", "closed"],
    }),
    listNotices({ boardType: "expense", publicOnly: true, limit: RECENT_POST_COUNT }),
    getCurrentProfile(),
  ])

  const dailyPostIds = dailyResult.posts.filter(post => post.source === "daily").map((post) => post.id)
  const [dailyCommentCounts, noticeCommentCounts, expenseCommentCounts, storyCommentCounts] = await Promise.all([
    fetchCommentCounts("daily", dailyPostIds),
    fetchCommentCounts(
      "notice",
      noticeResult.notices.map((notice) => notice.id)
    ),
    fetchCommentCounts("notice", expenseResult.notices.map((post) => post.id)),
    fetchCommentCounts("story", dailyResult.posts.filter(post => post.source === "story").map(post => post.id)),
  ])

  return (
    <div className="flex min-w-0 flex-col text-foreground">
      <div className="mb-6">
        <p className="mb-1 text-xs font-medium text-muted-foreground">아이들과 함께하는 왕왕랜드</p>
        <h1 className="text-3xl font-bold tracking-tight">왕왕랜드의 오늘</h1>
      </div>
      <section className="grid gap-4 md:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <div className="relative isolate min-h-[260px] overflow-hidden rounded-2xl bg-muted sm:min-h-[320px]">
              <Image
                src="/images/banner.jpeg"
                alt="왕왕랜드 아이들"
                fill
                sizes="(max-width: 1024px) 100vw, 1050px"
                className="object-cover object-center"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-0 px-6 py-7 text-white">
                <p className="mb-1 text-sm">우리의 일상</p>
                <h2 className="text-2xl font-bold">함께 돌보고, 일상을 나눠요</h2>
              </div>
        </div>
        <div className="flex flex-col justify-center rounded-2xl bg-secondary p-6 sm:p-7">
          <p className="text-xs text-muted-foreground">함께하는 방법</p>
          <h2 className="mt-3 text-2xl font-bold leading-snug">아이들과 함께할<br className="hidden md:block" /> 시간을 내어주세요</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">처음 방문하시는 분도 함께할 수 있어요.<br />가능한 날짜와 시간을 확인해 주세요.</p>
          <Link href="/volunteer" className="mt-6 flex min-h-12 items-center justify-between rounded-lg bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary/90">봉사 신청하기 <span aria-hidden>↗</span></Link>
          <div className="mt-2 flex flex-wrap gap-x-5 text-xs text-muted-foreground"><Link href="#volunteer-calendar" className="inline-flex min-h-11 items-center hover:text-primary">일정 먼저 보기</Link><Link href="/about" className="inline-flex min-h-11 items-center hover:text-primary">첫 방문 안내</Link></div>
        </div>
      </section>

            <section
              className="order-1 mt-5 grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"
              aria-label="후원 계좌 안내"
            >
              <span className="flex size-14 items-center justify-center rounded-2xl bg-accent">
                <BrandIcon name="heart" size={32} decorative />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-foreground">
                  보내주신 후원은 아이들을 돌보는 데 쓰입니다
                </h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  후원금은 구조 동물의 치료비와 생활비로 사용됩니다.
                </p>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card/80 px-4 py-3 text-sm text-foreground/80 sm:min-w-64 sm:text-base">
                <span className="min-w-0">
                  <span className="block whitespace-nowrap font-semibold">
                    {SITE.donation.bankName} {SITE.donation.accountNumber}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground sm:text-sm">
                    예금주: {SITE.donation.accountHolder}
                  </span>
                </span>
                <CopyButton
                  value={SITE.donation.accountNumber}
                  label="후원 계좌번호"
                  className="border-border bg-card text-primary hover:bg-primary/5"
                />
              </div>
            </section>

            <section className="order-2 mt-10" aria-labelledby="recent-community-heading">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2
                    id="recent-community-heading"
                    className="text-xl font-bold tracking-tight text-foreground sm:text-2xl"
                  >
                    왕왕랜드 이야기
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    아이들 소식과 함께한 경험을 나눠요.
                  </p>
                </div>
                <Link
                  href="/daily/new"
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary/10 px-3.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/15"
                >
                  <PenLine className="size-4" aria-hidden />
                  글쓰기
                </Link>
              </div>
              <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
                <article className="overflow-hidden rounded-xl border border-border bg-card">
                  <div className="flex items-center justify-between gap-3 border-b-2 border-primary px-5 py-4"><h3 className="font-semibold">일상 · 자유 · 후기</h3><Link href="/daily" className="inline-flex min-h-11 items-center text-xs text-primary hover:underline">전체 보기 →</Link></div>
                  <div className="divide-y divide-border">{dailyResult.posts.map(post => <PostListRow key={`${post.source}-${post.id}`} href={post.href} title={post.title} badge={<span className="text-xs text-primary">{post.category}</span>} thumbnail={post.images[0]} excerpt={stripHtml(post.content ?? "").slice(0, 100)} author={post.author} viewCount={post.viewCount} commentCount={(post.source === "daily" ? dailyCommentCounts : storyCommentCounts)[post.id] ?? 0} />)}</div>
                  {dailyResult.posts.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">나누고 싶은 이야기가 있다면 편하게 남겨주세요.</p>}
                </article>
                <div className="grid gap-6">
                <RecentBoard
                  title="공지사항"
                  href="/notice"
                  posts={noticeResult.notices.map((notice) => ({
                    id: notice.id,
                    title: notice.title,
                    href: `/notice/${notice.id}`,
                    author: notice.author?.nickname ?? "왕왕랜드",
                    viewCount: notice.view_count ?? 0,
                    commentCount: noticeCommentCounts[notice.id] ?? 0,
                  }))}
                />
                <RecentBoard
                  title="지출 내역"
                  emptyMessage={!profile ? "로그인 후 공개된 지출 내역을 확인할 수 있어요." : undefined}
                  href="/expenses"
                  posts={expenseResult.notices.map((post) => ({
                    id: post.id,
                    title: post.title,
                    href: `/expenses/${post.id}`,
                    author: post.author?.nickname ?? "왕왕랜드",
                    viewCount: post.view_count ?? 0,
                    commentCount: expenseCommentCounts[post.id] ?? 0,
                  }))}
                />
                </div>
              </div>
      </section>

            <section className="order-3 mt-10" aria-labelledby="waiting-dogs-heading">
              <SectionHeading
                id="waiting-dogs-heading"
                title="가족을 기다리는 아이들"
                description="아이의 사진을 눌러 자세한 이야기를 확인하세요."
                href="/dogs"
                linkLabel="전체 보기"
              />
              {dogs.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {dogs.map((dog) => (
                    <HomeDogCard key={dog.id} dog={dog} />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-card/80 p-10 text-center text-sm text-muted-foreground">
                  등록된 입양 대기 아이가 없습니다.
                </div>
              )}
            </section>

      <section
        id="volunteer-calendar"
        className="order-4 mt-10 scroll-mt-24"
        aria-labelledby="volunteer-calendar-heading"
      >
        <SectionHeading
          id="volunteer-calendar-heading"
          title="봉사 일정"
          description="월별 봉사 일정과 휴무일을 확인하세요."
          href="/calendar"
          linkLabel="전체 일정"
        />
        <div className="rounded-2xl border border-border bg-secondary/35 p-3 shadow-[0_10px_28px_rgba(88,76,68,0.06)] sm:p-5">
          <MonthNav yearMonth={scheduleYearMonth} basePath="/" />
          <MonthGrid
            yearMonth={scheduleYearMonth}
            events={scheduleEvents}
            hrefBase="/calendar"
            maskNames
            readOnly
          />
        </div>
      </section>
    </div>
  )
}

function SectionHeading({
  id,
  title,
  description,
  href,
  linkLabel,
}: {
  id: string
  title: string
  description: string
  href: string
  linkLabel: string
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <div>
        <h2
          id={id}
          className="text-xl font-bold tracking-tight text-foreground sm:text-2xl"
        >
          {title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      <Link
        href={href}
        className="inline-flex min-h-10 shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline"
      >
        {linkLabel}
        <ChevronRight className="size-4" aria-hidden />
      </Link>
    </div>
  )
}

function HomeDogCard({ dog }: { dog: Dog }) {
  const thumbnail = dog.images[dog.thumbnail_index] ?? dog.images[0] ?? null

  return (
    <Link
      href={`/dogs/${dog.id}`}
      className="group min-w-0 overflow-hidden rounded-2xl border border-border bg-card/90 shadow-[0_8px_24px_rgba(88,76,68,0.06)] transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_12px_28px_rgba(88,76,68,0.11)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={dog.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 240px"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <BrandIcon name="dog-happy" size={54} decorative />
          </div>
        )}
        <span className="absolute left-2.5 top-2.5 rounded-full bg-card/90 px-2.5 py-1 text-[11px] font-semibold text-foreground/75 shadow-sm backdrop-blur">
          {dog.status}
        </span>
      </div>
      <div className="p-3">
        <h3 className="truncate font-semibold text-foreground">
          {dog.name}
        </h3>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {[dog.breed, formatAge(dog)].filter(Boolean).join(" · ") || "왕왕랜드 친구"}
        </p>
      </div>
    </Link>
  )
}

function RecentBoard({
  title,
  href,
  posts,
  emptyMessage = "아직 등록된 글이 없습니다.",
}: {
  title: string
  href: string
  posts: RecentPostPreview[]
  emptyMessage?: string
}) {
  const slots = Array.from({ length: RECENT_POST_COUNT }, (_, index) => posts[index] ?? null)

  return (
    <article
      className="grid min-w-0 grid-rows-[auto_1fr_auto] overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="flex items-center justify-between gap-3 border-b-2 border-primary px-5 py-4">
        <h3 className="flex min-h-11 items-center font-semibold text-foreground">
          {title}
        </h3>
      </div>
      <div className="grid grid-rows-[auto_repeat(5,minmax(0,1fr))]">
        <div className="grid min-h-8 grid-cols-[minmax(0,1fr)_56px_44px] items-center gap-1.5 bg-secondary/60 px-3 text-[10px] font-semibold text-muted-foreground">
          <span>제목</span>
          <span className="text-right">작성자</span>
          <span className="text-right">조회</span>
        </div>
        {slots.map((post, index) =>
          post ? (
            <Link
              key={post.id}
              href={post.href}
              className="group grid min-h-11 min-w-0 grid-cols-[minmax(0,1fr)_56px_44px] items-center gap-1.5 border-b border-border px-3 text-xs transition-colors duration-150 last:border-b-0 hover:bg-primary/10 focus-visible:z-10 focus-visible:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50 active:bg-primary/15 motion-reduce:transition-none"
            >
              <span className="flex min-w-0 items-center text-foreground/80">
                <span className="truncate transition-colors duration-150 group-hover:text-primary group-hover:underline group-hover:decoration-primary/40 group-hover:underline-offset-4 group-focus-visible:text-primary motion-reduce:transition-none" title={post.title}>
                  {post.title}
                </span>
                {post.commentCount > 0 && (
                  <span className="ml-1 shrink-0 font-semibold text-primary">
                    ({post.commentCount})
                  </span>
                )}
              </span>
              <span
                className="truncate text-right text-[11px] text-muted-foreground"
                title={post.author}
              >
                {post.author}
              </span>
              <span className="inline-flex items-center justify-end gap-1 text-[11px] tabular-nums text-muted-foreground">
                <Eye className="size-3" aria-hidden />
                {post.viewCount}
              </span>
            </Link>
          ) : (
            <div
              key={`empty-${index}`}
              className="flex min-h-10 items-center border-b border-border px-3 text-xs text-muted-foreground/70 last:border-b-0"
              aria-hidden={index > 0}
            >
              {index === 0 ? emptyMessage : ""}
            </div>
          )
        )}
      </div>
      <Link
        href={href}
        className="group flex min-h-11 items-center justify-end gap-1 border-t border-border px-4 text-xs font-semibold text-primary transition-colors duration-150 hover:bg-primary/10 focus-visible:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50 active:bg-primary/15 motion-reduce:transition-none"
      >
        전체 보기
        <ChevronRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none" aria-hidden />
      </Link>
    </article>
  )
}

interface RecentPostPreview {
  id: string
  title: string
  href: string
  author: string
  viewCount: number
  commentCount: number
}
