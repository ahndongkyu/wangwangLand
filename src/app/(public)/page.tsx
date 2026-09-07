import Image from "next/image"
import Link from "next/link"
import { ChevronRight, Eye, PenLine } from "lucide-react"

import { fetchCommentCounts } from "@/features/comments"
import { listDailyPosts } from "@/features/daily"
import { listDogsForHome } from "@/features/dogs"
import { listEventsInRange, MonthGrid, MonthNav } from "@/features/events"
import { monthRange, todayKst, yearMonthKst } from "@/features/events/lib/date"
import { listNotices } from "@/features/notices"
import { BrandIcon, type BrandIconName } from "@/shared/components/brand-icon"
import { CopyButton } from "@/shared/components/copy-button"
import { SITE } from "@/shared/constants/site"
import { formatAge } from "@/shared/lib/age"
import type { Dog } from "@/shared/types/database"

export const revalidate = 60

const RECENT_POST_COUNT = 5
const YM_RE = /^\d{4}-\d{2}$/

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

  const [dogs, noticeResult, dailyResult, freeResult, scheduleEvents] = await Promise.all([
    listDogsForHome(4),
    listNotices({ limit: RECENT_POST_COUNT }),
    listDailyPosts({ board: "daily", limit: RECENT_POST_COUNT }),
    listDailyPosts({ board: "free", limit: RECENT_POST_COUNT }),
    listEventsInRange({
      from: scheduleRange.from,
      to: scheduleRange.to,
      categories: ["volunteer", "regular_volunteer", "closed"],
    }),
  ])

  const dailyPostIds = [...dailyResult.posts, ...freeResult.posts].map(
    (post) => post.id
  )
  const [dailyCommentCounts, noticeCommentCounts] = await Promise.all([
    fetchCommentCounts("daily", dailyPostIds),
    fetchCommentCounts(
      "notice",
      noticeResult.notices.map((notice) => notice.id)
    ),
  ])

  return (
    <div className="min-w-0 p-3 text-foreground sm:p-4 lg:p-5">
      <section className="relative isolate min-h-[210px] overflow-hidden rounded-[26px] border border-border bg-muted shadow-[0_16px_42px_rgba(88,76,68,0.10)] sm:min-h-[230px]">
              <Image
                src="/images/banner.jpeg"
                alt="왕왕랜드 아이들"
                fill
                sizes="(max-width: 1024px) 100vw, 1050px"
                className="object-cover object-center"
                priority
              />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,249,243,0.97)_0%,rgba(250,242,233,0.87)_45%,rgba(246,239,229,0.18)_76%)] dark:bg-[linear-gradient(90deg,rgba(29,33,30,0.96)_0%,rgba(37,43,39,0.84)_45%,rgba(37,43,39,0.18)_76%)]" />
              <div className="relative flex min-h-[210px] max-w-xl flex-col items-start justify-center px-6 py-8 sm:min-h-[230px] sm:px-9 lg:px-10">
                <h1 className="max-w-md text-2xl font-bold leading-snug tracking-tight text-foreground sm:text-3xl">
                  기다림이 가족을 만나는 순간까지
                </h1>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                  왕왕랜드 아이들의 오늘을 가까이에서 만나보세요.
                </p>
              </div>
      </section>

            <section className="mt-10" aria-labelledby="waiting-dogs-heading">
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
              className="mt-8 grid min-h-24 gap-4 rounded-2xl border border-border border-l-[5px] border-l-brand-sage bg-accent/60 p-5 shadow-[0_10px_28px_rgba(88,76,68,0.07)] sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:p-6"
              aria-label="후원 계좌 안내"
            >
              <span className="flex size-14 items-center justify-center rounded-2xl bg-accent">
                <BrandIcon name="heart" size={32} decorative />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-foreground">
                  작은 마음이 아이들의 하루를 바꿉니다
                </h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  후원금은 구조 동물의 치료비와 생활비로 사용됩니다.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-card/80 px-4 py-3 text-sm text-foreground/80 sm:text-base">
                <span className="whitespace-nowrap font-semibold">
                  {SITE.donation.bankName} {SITE.donation.accountNumber}
                </span>
                <CopyButton
                  value={SITE.donation.accountNumber}
                  label="후원 계좌번호"
                  className="border-border bg-card text-primary hover:bg-primary/5"
                />
              </div>
            </section>

            <section className="mt-10" aria-labelledby="recent-community-heading">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2
                    id="recent-community-heading"
                    className="text-xl font-bold tracking-tight text-foreground sm:text-2xl"
                  >
                    최근 소식
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    회원들과 나누는 새로운 이야기입니다.
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
              <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
                <RecentBoard
                  title="공지사항"
                  href="/notice"
                  icon="notification"
                  tone="coral"
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
                  title="일상"
                  href="/daily?category=일상"
                  icon="camera"
                  tone="sage"
                  posts={dailyResult.posts.map((post) => ({
                    id: post.id,
                    title: post.title,
                    href: `/daily/${post.id}`,
                    author: post.author?.nickname ?? "왕왕랜드",
                    viewCount: post.view_count ?? 0,
                    commentCount: dailyCommentCounts[post.id] ?? 0,
                  }))}
                />
                <RecentBoard
                  title="자유게시판"
                  href="/daily?category=자유게시판"
                  icon="chat"
                  tone="yellow"
                  posts={freeResult.posts.map((post) => ({
                    id: post.id,
                    title: post.title,
                    href: `/daily/${post.id}`,
                    author: post.author?.nickname ?? "왕왕랜드",
                    viewCount: post.view_count ?? 0,
                    commentCount: dailyCommentCounts[post.id] ?? 0,
                  }))}
                />
              </div>
      </section>

      <section
        id="volunteer-calendar"
        className="mt-10"
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
  icon,
  tone,
  posts,
}: {
  title: string
  href: string
  icon: BrandIconName
  tone: "coral" | "sage" | "yellow"
  posts: RecentPostPreview[]
}) {
  const toneClass = {
    coral: "border-t-[#e89273]",
    sage: "border-t-[#a9c7b5]",
    yellow: "border-t-[#f2d59b]",
  }[tone]
  const slots = Array.from({ length: RECENT_POST_COUNT }, (_, index) => posts[index] ?? null)

  return (
    <article
      className={`grid min-w-0 grid-rows-[auto_1fr_auto] overflow-hidden rounded-2xl border border-border border-t-4 bg-card/90 shadow-[0_8px_24px_rgba(88,76,68,0.06)] ${toneClass}`}
    >
      <div className="flex min-h-12 items-center gap-2 px-4">
        <BrandIcon name={icon} size={19} decorative />
        <h3 className="font-semibold text-foreground">
          {title}
        </h3>
      </div>
      <div className="grid grid-rows-[auto_repeat(5,minmax(0,1fr))] border-t border-border">
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
              className="grid min-h-10 min-w-0 grid-cols-[minmax(0,1fr)_56px_44px] items-center gap-1.5 border-b border-border/70 px-3 text-xs transition-colors last:border-b-0 hover:bg-primary/5"
            >
              <span className="flex min-w-0 items-center text-foreground/80">
                <span className="truncate" title={post.title}>
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
              className="flex min-h-10 items-center border-b border-border/70 px-3 text-xs text-muted-foreground/70 last:border-b-0"
              aria-hidden={index > 0}
            >
              {index === 0 ? "아직 등록된 글이 없습니다." : ""}
            </div>
          )
        )}
      </div>
      <Link
        href={href}
        className="flex min-h-11 items-center justify-end gap-1 border-t border-border px-4 text-xs font-semibold text-primary hover:bg-primary/5"
      >
        전체 보기
        <ChevronRight className="size-3.5" aria-hidden />
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
