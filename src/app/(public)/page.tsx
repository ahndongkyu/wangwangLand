import Link from "next/link"

import { listCats } from "@/features/cats"
import { DailyCard, listDailyPosts } from "@/features/daily"
import { DogGrid, listDogsForHome } from "@/features/dogs"
import { listNotices, RecentNewsSection } from "@/features/notices"
import { StoryCard, listAdoptionStories } from "@/features/stories"
import { Heart } from "lucide-react"
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
      listDogsForHome(10),
      listCats({ status: "보호중", limit: 4 }),
      listDailyPosts({ limit: 3 }),
      listAdoptionStories({ limit: 3 }),
      getSiteStats(),
      listNotices({ limit: 4 }),
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
        <div className="mx-auto w-full max-w-4xl px-4 py-16 md:px-6 md:py-20">
          {/* 헤더 */}
          <div className="mb-10 text-center">
            <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              우리의 약속
            </span>
            <h2 className="mt-4 text-3xl font-bold leading-snug text-foreground md:text-4xl">
              어떤 이유로도 아이들의 생명을
              <br />
              <span className="text-primary">포기하지 않습니다</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
              {SITE.name}는 100% 안락사 없는 보호소입니다.<br />
              모든 아이가 새로운 가족을 만날 때까지 사랑으로 끝까지 책임집니다.
            </p>
          </div>

          {/* 액션 영역: 항상 5열 (후원하기 2열 + 버튼 3열) */}
          <div className="grid grid-cols-5 gap-3">
            {/* 후원하기 CTA */}
            <Link
              href="/donate"
              className="relative col-span-2 flex flex-col items-center justify-center overflow-hidden rounded-2xl px-2 py-5 text-center text-white shadow-lg transition-transform hover:-translate-y-0.5 md:py-8
                bg-[linear-gradient(135deg,#E89B6C_0%,#D4855A_100%)]
                dark:bg-[linear-gradient(135deg,#C4784A_0%,#A8623A_100%)]"
            >
              <span className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
              <span className="pointer-events-none absolute -bottom-4 -left-4 h-16 w-16 rounded-full bg-white/10" />
              <Heart
                className="relative z-10 size-9 fill-[#FF8FA3] stroke-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.25)] dark:fill-[#FFB6C1] md:size-11"
                strokeWidth={1.75}
                aria-hidden
              />
              <span className="relative z-10 mt-2 text-sm font-bold leading-tight md:mt-3 md:text-lg">후원하기</span>
              <span className="relative z-10 mt-1 text-[10px] text-white/80 md:text-xs">소중한 생명을 지켜주세요</span>
            </Link>

            {/* 2×2 버튼 그리드 */}
            <div className="col-span-3 grid grid-cols-2 gap-2 md:gap-4">
              <MissionActionButton href="/adopt" label="입양 신청" icon="adopted" />
              <MissionActionButton href="/adopt" label="임보 신청" icon="home-shelter" />
              <MissionActionButton href="/volunteer" label="봉사 신청" icon="volunteer" />
              <MissionActionButton href="/donate" label="물품 후원" icon="heart" />
            </div>
          </div>
        </div>
      </section>

      {/* 2. 실적 카운터 */}
      <section className="border-t border-primary/10 bg-primary/5">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 md:px-6 md:py-16 2xl:max-w-7xl">
          <div className="mb-10 text-center">
            <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              우리의 기록
            </span>
            <h2 className="mt-3 text-2xl font-bold text-foreground md:text-3xl">
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
        <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6 2xl:max-w-7xl">
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
            tieredLimits={{ mobile: 4, md: 6, lg: 8, xl: 10 }}
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
          <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6 2xl:max-w-7xl">
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
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {recentStories.map((story) => (
                <StoryCard key={story.id} story={story} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 5. 최근 소식 — 카테고리 카드 그리드 */}
      <RecentNewsSection notices={recentNotices} />
      {/* 6. 왕왕랜드 일상 */}
      {recentDaily.length > 0 && (
        <section className="border-t border-border/60 bg-card">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6 2xl:max-w-7xl">
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
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
          <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6 2xl:max-w-7xl">
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
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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

function MissionActionButton({
  href,
  label,
  icon,
}: {
  href: string
  label: string
  icon: BrandIconName
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-2 py-3 text-[11px] font-semibold text-foreground transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm md:py-5 md:text-sm"
    >
      <BrandIcon name={icon} size={22} decorative className="md:size-7" />
      {label}
    </Link>
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
      className="group rounded-xl border border-border bg-card p-4 text-center transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md md:p-6"
    >
      <div className="flex justify-center">
        <BrandIcon name={icon} size={36} decorative className="md:size-12" />
      </div>
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:mt-3 md:text-xs">
        {label}
      </p>
      {showFallback ? (
        <p className="mt-1 text-xl font-bold text-primary md:text-3xl">
          {fallbackText}
        </p>
      ) : (
        <p className="mt-1 text-2xl font-bold text-foreground md:text-4xl">
          <CountUp value={value} />
          <span className="ml-0.5 text-xs font-medium text-muted-foreground">
            {suffix}
          </span>
        </p>
      )}
    </Link>
  )
}
