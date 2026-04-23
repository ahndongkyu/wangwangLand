import Link from "next/link"

import { listCats } from "@/features/cats"
import { DailyCard, listDailyPosts } from "@/features/daily"
import { DogGrid, listDogs } from "@/features/dogs"
import { listNotices } from "@/features/notices"
import { StoryCard, listAdoptionStories } from "@/features/stories"
import { Pin } from "lucide-react"
import {
  BrandIcon,
  type BrandIconName,
} from "@/shared/components/brand-icon"
import { CountUp } from "@/shared/components/count-up"
import {
  HeroCarousel,
  type HeroSlide,
} from "@/shared/components/hero-carousel"
import { OrganizationJsonLd } from "@/shared/components/structured-data"
import { buttonVariants } from "@/shared/components/ui/button"
import { SITE } from "@/shared/constants/site"
import { getSiteStats } from "@/shared/lib/stats"
import { cn } from "@/shared/lib/utils"

const HERO_SLIDES: HeroSlide[] = [
  {
    image: "/images/banner.jpeg",
    badge: SITE.subtitle,
    title: SITE.tagline,
    description: `${SITE.name}는 어떤 이유로도 아이들의 생명을 포기하지 않습니다.\n새로운 가족을 만날 때까지 사랑으로 돌봅니다.`,
    primary: { label: "입양 대기 아이들 보기", href: "/dogs" },
    secondary: { label: `${SITE.name} 소개`, href: "/about" },
  },
  {
    image: "/images/banner_2.jpg",
    badge: "🤝 펫발란스 · 사료 공구 이벤트",
    title: "펫발란스 × 왕왕랜드",
    description:
      "펫발란스와 함께하는 프리미엄 사료 이벤트.\n한 봉지 구매가 왕왕랜드 아이들의 한 끼가 됩니다.",
    primary: {
      label: "펫발란스 바로가기",
      href: SITE.partners.barunPuppyLab.url,
      external: true,
    },
    secondary: { label: "후원 안내", href: "/donate" },
  },
]

export const revalidate = 60

export default async function HomePage() {
  const [dogs, cats, dailyResult, storiesResult, stats, noticesResult] =
    await Promise.all([
      listDogs({ status: "보호중", limit: 8 }),
      listCats({ status: "보호중", limit: 4 }),
      listDailyPosts({ limit: 3 }),
      listAdoptionStories({ limit: 3 }),
      getSiteStats(),
      listNotices({ limit: 3 }),
    ])
  const recentDaily = dailyResult.posts
  const recentStories = storiesResult.stories
  const recentNotices = noticesResult.notices

  return (
    <>
      <OrganizationJsonLd />
      <HeroCarousel slides={HERO_SLIDES} interval={5000} autoPlayInitial />

      {/* 1. 미션 블록 */}
      <section className="border-t border-border/60 bg-card">
        <div className="mx-auto w-full max-w-4xl px-4 py-20 text-center md:px-6 md:py-24">
          <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            우리의 약속
          </span>
          <h2 className="mt-5 text-3xl font-bold leading-snug text-foreground md:text-4xl">
            어떤 이유로도 아이들의 생명을
            <br />
            포기하지 않습니다
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
            {SITE.name}는 100% 안락사 없는 보호소입니다.
            병들거나 나이 든 아이도, 사회성 훈련이 필요한 아이도 새로운 가족을
            만날 때까지 사랑으로 끝까지 책임집니다. 매일 봉사자와 운영진이 아이들
            하나하나를 돌보고 있어요.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/about"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              센터 소개 자세히 보기 →
            </Link>
          </div>
        </div>
      </section>

      {/* 2. 실적 카운터 */}
      <section className="border-t border-border/60 bg-background">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 md:px-6 md:py-16">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              지금까지의 기록
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              운영 현황을 투명하게 공개합니다.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <CounterCard
              icon="heart"
              label="누적 구조"
              value={stats.rescued}
              suffix="마리"
              href="/dogs?status=전체"
            />
            <CounterCard
              icon="home-shelter"
              label="현재 보호 중"
              value={stats.sheltered}
              suffix="마리"
              href="/dogs"
            />
            <CounterCard
              icon="adopted"
              label="입양 완료"
              value={stats.adopted}
              suffix="마리"
              href="/dogs?status=입양완료"
            />
            <CounterCard
              icon="volunteer"
              label="누적 봉사자"
              value={stats.volunteers}
              suffix="명"
              href="/volunteer"
              fallbackText="모집 중"
            />
          </div>
        </div>
      </section>

      {/* 3. 새 가족을 기다려요 (강아지) */}
      <section className="border-t border-border/60 bg-background">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6">
          <div className="mb-10 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground md:text-3xl">
                새 가족을 기다려요
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {SITE.name}에서 따뜻한 손길을 기다리고 있는 친구들입니다.
              </p>
            </div>
            <Link
              href="/dogs"
              className="hidden text-sm font-semibold text-primary hover:underline sm:inline"
            >
              전체 보기 →
            </Link>
          </div>

          <DogGrid
            dogs={dogs}
            mobileLimit={6}
            emptyMessage="아직 등록된 아이가 없어요. 곧 만나게 될 친구들을 준비 중입니다."
          />

          <div className="mt-8 text-center sm:hidden">
            <Link
              href="/dogs"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              전체 아이들 보기
            </Link>
          </div>
        </div>
      </section>

      {/* 4. 입양 후기 — 강아지 섹션 바로 밑으로 승격 */}
      {recentStories.length > 0 && (
        <section className="border-t border-border/60 bg-card">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6">
            <div className="mb-10 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground md:text-3xl">
                  새 가족이 생겼어요
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  따뜻한 사랑을 받고 있는 아이들의 이야기.
                </p>
              </div>
              <Link
                href="/stories"
                className="hidden text-sm font-semibold text-primary hover:underline sm:inline"
              >
                전체 후기 →
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {recentStories.map((story) => (
                <StoryCard key={story.id} story={story} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 5. 최근 공지사항 — 푸터 CTA 와의 중복을 피하고 운영 활성도 노출 */}
      {recentNotices.length > 0 && (
        <section className="border-t border-border/60 bg-background">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground md:text-3xl">
                  <BrandIcon name="notification" size={28} decorative />
                  최근 소식
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  왕왕랜드의 최신 안내·이벤트입니다.
                </p>
              </div>
              <Link
                href="/notice"
                className="hidden text-sm font-semibold text-primary hover:underline sm:inline"
              >
                전체 공지 →
              </Link>
            </div>
            <ul className="overflow-hidden rounded-xl border border-border bg-card">
              {recentNotices.map((n) => (
                <li
                  key={n.id}
                  className="border-b border-border last:border-0"
                >
                  <Link
                    href={`/notice/${n.id}`}
                    className="grid grid-cols-[16px_1fr_auto] items-center gap-3 px-5 py-4 transition-colors hover:bg-secondary/40"
                  >
                    <span className="flex items-center justify-center">
                      {n.is_pinned && (
                        <Pin className="size-3.5 text-primary" aria-label="상단고정" />
                      )}
                    </span>
                    <span className="truncate font-medium text-foreground">
                      {n.title}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {n.published_at &&
                        new Date(n.published_at).toLocaleDateString("ko-KR")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
      {/* 6. 왕왕랜드 일상 */}
      {recentDaily.length > 0 && (
        <section className="border-t border-border/60 bg-card">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6">
            <div className="mb-10 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground md:text-3xl">
                  왕왕랜드 일상
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  봉사 활동과 아이들의 평범한 하루를 기록합니다.
                </p>
              </div>
              <Link
                href="/daily"
                className="hidden text-sm font-semibold text-primary hover:underline sm:inline"
              >
                전체 보기 →
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {recentDaily.map((post) => (
                <DailyCard key={post.id} post={post} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 7. 고양이 친구들 (보호 중일 때만) */}
      {cats.length > 0 && (
        <section className="border-t border-border/60 bg-background">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6">
            <div className="mb-10 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground md:text-3xl">
                  고양이 친구들
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {SITE.name}의 냥이들입니다.
                </p>
              </div>
              <Link
                href="/cats"
                className="hidden text-sm font-semibold text-primary hover:underline sm:inline"
              >
                전체 보기 →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {cats.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/cats/${cat.id}`}
                  className="group block overflow-hidden rounded-lg border border-border bg-card"
                >
                  <div className="flex aspect-square items-center justify-center bg-muted text-4xl">
                    🐱
                  </div>
                  <div className="p-4">
                    <p className="font-semibold text-foreground">{cat.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {cat.breed ?? "고양이"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  )
}

function CounterCard({
  icon,
  label,
  value,
  suffix,
  href,
  fallbackText,
}: {
  icon: BrandIconName
  label: string
  value: number
  suffix: string
  href: string
  /** value 가 0 일 때 숫자 대신 보여줄 문구 (예: "모집 중") */
  fallbackText?: string
}) {
  const showFallback = value === 0 && !!fallbackText
  return (
    <Link
      href={href}
      className="group rounded-xl border border-border bg-card p-6 text-center transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
    >
      <div className="flex justify-center">
        <BrandIcon name={icon} size={48} decorative />
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {showFallback ? (
        <p className="mt-1 text-2xl font-bold text-primary md:text-3xl">
          {fallbackText}
        </p>
      ) : (
        <p className="mt-1 text-3xl font-bold text-foreground md:text-4xl">
          <CountUp value={value} />
          <span className="ml-0.5 text-sm font-medium text-muted-foreground">
            {suffix}
          </span>
        </p>
      )}
    </Link>
  )
}
