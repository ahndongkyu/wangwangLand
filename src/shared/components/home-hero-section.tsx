import Image from "next/image"
import Link from "next/link"
import type { ReactNode } from "react"
import {
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  Heart,
  HeartHandshake,
  PawPrint,
  Settings,
  User,
} from "lucide-react"

import type { Profile } from "@/features/members"
import {
  HeroCarousel,
  type HeroSlide,
} from "@/shared/components/hero-carousel"
import { buttonVariants } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"

interface HomeMemberSummary {
  nextEvent: {
    href: string
    startsAt: string
    title: string
  } | null
  approvedApplications: number
  pendingApplications: number
}

interface HomeHeroSectionProps {
  slides: HeroSlide[]
  profile: Profile | null
  memberSummary: HomeMemberSummary | null
}

const ROLE_LABEL: Record<Profile["role"], string> = {
  admin: "관리자",
  staff: "운영진",
  full_member: "정회원",
  member: "회원",
}

export function HomeHeroSection({
  slides,
  profile,
  memberSummary,
}: HomeHeroSectionProps) {
  return (
    <section className="bg-background lg:py-6">
      <div className="lg:mx-auto lg:grid lg:w-full lg:max-w-6xl lg:grid-cols-[minmax(0,2.15fr)_minmax(260px,0.85fr)] lg:gap-4 lg:px-6 2xl:max-w-7xl">
        <HeroCarousel
          slides={slides}
          interval={5000}
          autoPlayInitial
          desktopSlideRatio={1}
          desktopSlideRatioBreakpoint={1024}
          className="lg:pb-0"
        />
        <DesktopMemberPanel profile={profile} summary={memberSummary} />
      </div>
    </section>
  )
}

function DesktopMemberPanel({
  profile,
  summary,
}: {
  profile: Profile | null
  summary: HomeMemberSummary | null
}) {
  if (!profile) {
    return (
      <aside className="hidden min-w-0 flex-col rounded-2xl border border-border bg-card p-5 shadow-sm lg:flex">
        <div>
          <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
            왕왕랜드 회원
          </span>
          <h2 className="mt-4 text-xl font-bold text-foreground">
            로그인하고 편하게 참여하세요
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            홈페이지 활동을 한곳에서 확인할 수 있어요.
          </p>
        </div>

        <div className="my-4 divide-y divide-border">
          <GuestBenefit
            icon={<CalendarDays className="size-4" />}
            title="내 일정 관리"
            description="확정된 봉사 일정을 바로 확인"
          />
          <GuestBenefit
            icon={<ClipboardCheck className="size-4" />}
            title="신청 현황 확인"
            description="승인과 진행 상태를 한눈에 확인"
          />
          <GuestBenefit
            icon={<Heart className="size-4" />}
            title="관심 아이 저장"
            description="마음에 둔 아이를 편하게 모아보기"
          />
        </div>

        <div className="mt-auto grid gap-2">
          <Link
            href="/login"
            className={cn(buttonVariants({ size: "lg" }), "w-full")}
          >
            카카오로 로그인
          </Link>
          <Link
            href="/dogs"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "w-full"
            )}
          >
            입양 기다리는 아이 보기
          </Link>
        </div>
      </aside>
    )
  }

  const isStaff = profile.role === "staff" || profile.role === "admin"

  return (
    <aside className="hidden min-w-0 flex-col rounded-2xl border border-border bg-card p-5 shadow-sm lg:flex">
      <Link href="/my" className="flex items-center gap-3">
        <div className="relative size-12 shrink-0 overflow-hidden rounded-full border-2 border-primary/30 bg-muted">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.nickname}
              fill
              className="object-cover"
            />
          ) : (
            <User className="size-full p-2.5 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <span
            className={cn(
              "inline-flex rounded-full border px-2 py-0.5 text-[9px] font-semibold leading-none",
              profile.role === "admin"
                ? "border-red-500/60 text-red-700 dark:text-red-400"
                : profile.role === "staff"
                  ? "border-amber-500/60 text-amber-700 dark:text-amber-400"
                  : "border-primary/40 text-primary"
            )}
          >
            {ROLE_LABEL[profile.role]}
          </span>
          <span className="mt-1.5 block truncate text-sm font-bold text-foreground">
            {profile.nickname}님
          </span>
        </div>
        <span className="shrink-0 text-[11px] font-medium text-primary">
          마이페이지 →
        </span>
      </Link>

      {summary && (
        <div className="mt-3 divide-y divide-border">
          <Link
            href={summary.nextEvent?.href ?? "/calendar"}
            className="flex min-w-0 items-center gap-2.5 py-2.5 transition-colors hover:text-primary"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CalendarDays className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-medium text-muted-foreground">
                다음 일정
              </span>
              <span className="mt-0.5 block truncate text-[11px] font-semibold text-foreground">
                {summary.nextEvent
                  ? `${formatDesktopDate(summary.nextEvent.startsAt)} · ${summary.nextEvent.title}`
                  : "예정된 일정 없음"}
              </span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </Link>

          <Link
            href="/my/applications"
            className="flex min-w-0 items-center gap-2.5 py-2.5 transition-colors hover:text-primary"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ClipboardCheck className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-medium text-muted-foreground">
                신청 현황
              </span>
              <span className="mt-0.5 block truncate text-[11px] font-semibold text-foreground">
                승인 {summary.approvedApplications} · 진행{" "}
                {summary.pendingApplications}
              </span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        </div>
      )}

      <div className="mt-auto grid grid-cols-2 gap-2 pt-3">
        <MemberQuickLink
          href="/volunteer"
          icon={<PawPrint className="size-3.5" />}
          label="봉사 신청"
        />
        <MemberQuickLink
          href="/adopt"
          icon={<HeartHandshake className="size-3.5" />}
          label="입양 신청"
        />
        <MemberQuickLink
          href="/my/likes"
          icon={<Heart className="size-3.5" />}
          label="관심 아이"
        />
        {isStaff && (
          <MemberQuickLink
            href="/admin"
            icon={<Settings className="size-3.5" />}
            label="관리자"
          />
        )}
      </div>

      <div className="mt-2">
        <Link
          href="/dogs"
          className={cn(buttonVariants(), "w-full justify-between")}
        >
          <span>입양 기다리는 아이 보기</span>
          <Heart className="size-4" />
        </Link>
      </div>
    </aside>
  )
}

function GuestBenefit({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex items-center gap-2.5 py-2.5 first:pt-0 last:pb-0">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="min-w-0">
        <strong className="block text-xs font-semibold text-foreground">
          {title}
        </strong>
        <span className="mt-0.5 block text-[10px] text-muted-foreground">
          {description}
        </span>
      </span>
    </div>
  )
}

function MemberQuickLink({
  href,
  icon,
  label,
}: {
  href: string
  icon: ReactNode
  label: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        buttonVariants({ variant: "outline", size: "sm" }),
        "h-9 min-w-0 gap-1.5 px-2 text-[11px]"
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
    </Link>
  )
}

function formatDesktopDate(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(new Date(iso))
}
