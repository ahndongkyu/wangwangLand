import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"
import {
  Calendar,
  ChevronDown,
  Heart,
  HeartHandshake,
  Home as HomeIcon,
  MapPin,
  MoonStar,
  ShieldCheck,
  Sprout,
  Stethoscope,
  Sun,
  Sunrise,
  Users,
} from "lucide-react"

import { CopyButton } from "@/shared/components/copy-button"
import { buttonVariants } from "@/shared/components/ui/button"
import { SITE } from "@/shared/constants/site"
import { getSiteStats } from "@/shared/lib/stats"
import { cn } from "@/shared/lib/utils"

export const metadata: Metadata = {
  title: "센터 소개",
  description: `${SITE.name}는 어떤 단체이며, 어떤 가치로 활동하는지 소개합니다.`,
}

// 센터 현황은 페이지를 열 때마다 최신 운영 데이터를 조회한다.
export const revalidate = 0

const FAQ_ITEMS = [
  {
    question: "입양은 어떻게 진행되나요?",
    answer:
      "강아지·고양이 페이지에서 만나고 싶은 아이를 확인한 뒤 입양 문의 폼을 작성해 주세요. 운영진 검토와 연락, 통화·방문 상담, 가정 점검을 거쳐 입양이 확정됩니다. 입양 후에도 아이의 근황을 함께 나눠주세요.",
  },
  {
    question: "봉사는 누구나 신청할 수 있나요?",
    answer:
      "만 14세 이상이면 누구나 신청할 수 있습니다. 개인은 물론 단체·기업 봉사도 환영하며, 신청 후 운영진이 일정을 확인해 안내드립니다.",
  },
  {
    question: "후원금은 어떻게 사용되나요?",
    answer:
      "후원금은 사료와 간식, 예방접종·중성화·치료 등의 병원비, 시설 유지비와 보호소 운영에 필요한 소모품 구입에 사용됩니다.",
  },
  {
    question: "기부금영수증 발급이 가능한가요?",
    answer:
      "현재는 공익성 단체 등록 전이라 기부금영수증 발급이 어렵습니다. 후원 기록은 보관하고 있으며, 등록 완료 후 안내드리겠습니다.",
  },
  {
    question: "임시보호도 가능한가요?",
    answer:
      "가능합니다. 입양 전 일정 기간 가정에서 아이를 돌보는 방식이며, 자세한 조건과 지원 범위는 운영진과 상담 후 결정합니다.",
  },
] as const

export default async function AboutPage() {
  const stats = await getSiteStats()

  return (
    <div className="min-w-0 p-3 text-foreground sm:p-4 lg:p-5">
      <section className="overflow-hidden rounded-[26px] border border-border bg-card shadow-[0_16px_42px_rgba(88,76,68,0.09)] md:grid md:grid-cols-[1.08fr_0.92fr]">
        <div className="relative min-h-64 overflow-hidden bg-muted sm:min-h-72 md:min-h-[360px]">
          <Image
            src="/images/banner.jpeg"
            alt="왕왕랜드 보호소에서 함께 지내는 강아지들"
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1440px) 48vw, 540px"
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
          <span className="absolute bottom-5 left-5 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/35 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm sm:bottom-6 sm:left-6">
            <MapPin className="size-3.5" aria-hidden />
            영종도 유기견 보호소
          </span>
        </div>

        <div className="flex flex-col justify-center px-6 py-9 sm:px-9 sm:py-10 lg:px-11">
          <span className="text-[11px] font-bold tracking-[0.18em] text-primary uppercase">
            About Wangwangland
          </span>
          <h1 className="mt-3 text-3xl font-bold leading-tight tracking-[-0.04em] text-foreground sm:text-4xl">
            기다림이 가족을
            <br />
            만나는 순간까지
          </h1>
          <p className="mt-5 max-w-md text-sm leading-7 text-muted-foreground sm:text-base">
            왕왕랜드는 구조된 아이들이 안전하게 회복하고 평생 가족을 만날
            때까지 함께합니다.
          </p>
          <div className="mt-7 flex flex-wrap gap-2.5">
            <Link
              href="/dogs"
              className={cn(buttonVariants({ size: "lg" }), "h-11 px-4")}
            >
              아이들 만나기
            </Link>
            <Link
              href="/volunteer"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-11 px-4"
              )}
            >
              봉사로 함께하기
            </Link>
          </div>
        </div>
      </section>

      <section
        className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4"
        aria-label="센터 현황"
      >
        <StatCard
          icon={<Sprout className="size-5" aria-hidden />}
          label="누적 구조"
          value={stats.rescued}
          suffix="마리"
        />
        <StatCard
          icon={<HomeIcon className="size-5" aria-hidden />}
          label="현재 보호 중"
          value={stats.sheltered}
          suffix="마리"
        />
        <StatCard
          icon={<HeartHandshake className="size-5" aria-hidden />}
          label="입양 완료"
          value={stats.adopted}
          suffix="마리"
        />
        <StatCard
          icon={<Users className="size-5" aria-hidden />}
          label="누적 봉사자"
          value={stats.volunteers}
          suffix="명"
        />
      </section>

      <section className="mt-12" aria-labelledby="mission-heading">
        <SectionHeading
          eyebrow="What we do"
          id="mission-heading"
          title="아이의 내일을 준비하는 일"
          description="구조 이후의 하루부터 평생 가족을 만나는 순간까지 책임집니다."
        />
        <div className="grid gap-5 md:grid-cols-3 md:gap-7">
          <MissionStep
            icon={<ShieldCheck className="size-5" aria-hidden />}
            title="구조와 보호"
            description="도움이 필요한 아이를 구조하고 안전한 보금자리에서 돌봅니다."
          />
          <MissionStep
            icon={<Stethoscope className="size-5" aria-hidden />}
            title="회복과 사회화"
            description="건강을 회복하고 사람과 다시 가까워질 수 있도록 기다려 줍니다."
          />
          <MissionStep
            icon={<Heart className="size-5" aria-hidden />}
            title="평생 가족 연결"
            description="아이에게 맞는 가족을 만나고 입양 후에도 꾸준히 소통합니다."
          />
        </div>
      </section>

      <section className="mt-12" aria-labelledby="day-heading">
        <SectionHeading
          eyebrow="A day at the shelter"
          id="day-heading"
          title="왕왕랜드의 하루"
          description="매일 반복되는 작은 돌봄이 아이들에게 평온한 하루를 만듭니다."
        />
        <div className="overflow-hidden rounded-2xl border border-border bg-secondary/30 lg:grid lg:grid-cols-[1.15fr_0.85fr]">
          <div className="relative min-h-64 overflow-hidden bg-muted sm:min-h-80 lg:min-h-[350px]">
            <Image
              src="/images/about.jpg"
              alt="왕왕랜드에서 보호 중인 강아지"
              fill
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
              <p className="text-lg font-bold sm:text-xl">
                작은 돌봄이 모여 평온한 하루가 됩니다
              </p>
              <p className="mt-1 text-sm text-white/75">
                오늘도 아이들의 속도에 맞춰 천천히 돌봅니다.
              </p>
            </div>
          </div>
          <div className="divide-y divide-border px-6 py-2 sm:px-8 lg:flex lg:flex-col lg:justify-center lg:py-6">
            <DailyStep
              icon={<Sunrise className="size-4.5" aria-hidden />}
              period="아침"
              title="식사와 건강 확인"
              description="아이마다 필요한 사료와 약을 챙깁니다."
            />
            <DailyStep
              icon={<Sun className="size-4.5" aria-hidden />}
              period="낮"
              title="산책과 생활 공간 관리"
              description="함께 움직이고 머무는 곳을 정돈합니다."
            />
            <DailyStep
              icon={<MoonStar className="size-4.5" aria-hidden />}
              period="저녁"
              title="휴식과 교감"
              description="하루를 마무리하며 아이들의 상태를 살핍니다."
            />
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-5 rounded-2xl border border-border border-l-[5px] border-l-brand-sage bg-accent/70 p-6 shadow-[0_10px_28px_rgba(88,76,68,0.06)] sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            한 아이의 내일에 함께해 주세요
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            입양, 봉사, 후원. 가능한 방식으로 왕왕랜드 가족이 되어주세요.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/adopt"
            className={cn(buttonVariants({ variant: "outline" }), "h-10 px-3.5")}
          >
            입양 문의
          </Link>
          <Link
            href="/volunteer"
            className={cn(buttonVariants(), "h-10 px-3.5")}
          >
            봉사 신청
          </Link>
          <Link
            href="/donate"
            className={cn(buttonVariants({ variant: "secondary" }), "h-10 px-3.5")}
          >
            후원하기
          </Link>
        </div>
      </section>

      <section className="mt-12 grid gap-8 border-t border-border pt-10 lg:grid-cols-2 lg:gap-12">
        <div aria-labelledby="visit-heading">
          <SectionHeading
            eyebrow="Visit us"
            id="visit-heading"
            title="오시는 길"
            description="방문 전 봉사 신청 또는 입양 문의를 먼저 작성해 주세요."
          />
          <div className="rounded-2xl border border-border bg-secondary/25 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MapPin className="size-4.5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {SITE.contact.address}
                </p>
                {SITE.contact.addressNote && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {SITE.contact.addressNote}
                  </p>
                )}
                <CopyButton
                  value={SITE.contact.address}
                  label="주소"
                  className="mt-3"
                />
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href={`https://map.naver.com/v5/search/${encodeURIComponent(SITE.contact.mapQuery || SITE.contact.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                네이버 지도
              </a>
              <a
                href={`https://map.kakao.com/?q=${encodeURIComponent(SITE.contact.mapQuery || SITE.contact.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                카카오 지도
              </a>
            </div>
          </div>
        </div>

        <div aria-labelledby="trust-heading">
          <SectionHeading
            eyebrow="Transparency"
            id="trust-heading"
            title="믿을 수 있는 단체 정보"
            description="왕왕랜드의 등록 정보와 운영 형태를 투명하게 안내합니다."
          />
          <dl className="divide-y divide-border rounded-2xl border border-border bg-card px-5 sm:px-6">
            {SITE.registration.taxId && (
              <RegistrationRow label="고유번호">
                {SITE.registration.taxId}
              </RegistrationRow>
            )}
            {SITE.registration.shelterNumber && (
              <RegistrationRow label="동물보호센터 등록번호">
                {SITE.registration.shelterNumber}
              </RegistrationRow>
            )}
            {SITE.registration.representativeName && (
              <RegistrationRow label="대표자">
                {SITE.registration.representativeName}
              </RegistrationRow>
            )}
            <RegistrationRow label="설립 형태">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="size-3.5 text-muted-foreground" aria-hidden />
                비영리 동물 보호 단체
              </span>
            </RegistrationRow>
          </dl>
        </div>
      </section>

      <section className="mt-12" aria-labelledby="faq-heading">
        <SectionHeading
          eyebrow="FAQ"
          id="faq-heading"
          title="자주 묻는 질문"
          description="입양과 봉사, 후원 전에 많이 궁금해하시는 내용을 모았습니다."
        />
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {FAQ_ITEMS.map((item) => (
            <FaqItem
              key={item.question}
              question={item.question}
              answer={item.answer}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  suffix,
}: {
  icon: React.ReactNode
  label: string
  value: number
  suffix: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-center transition-colors hover:border-primary/40">
      <span className="mx-auto mb-2 flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </span>
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">
        {value.toLocaleString()}
        <span className="ml-0.5 text-sm font-medium text-muted-foreground">
          {suffix}
        </span>
      </p>
    </div>
  )
}

function SectionHeading({
  eyebrow,
  id,
  title,
  description,
}: {
  eyebrow: string
  id: string
  title: string
  description: string
}) {
  return (
    <header className="mb-5">
      <span className="text-[11px] font-bold tracking-[0.16em] text-primary uppercase">
        {eyebrow}
      </span>
      <h2
        id={id}
        className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
      >
        {title}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </header>
  )
}

function MissionStep({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="border-t border-border pt-5">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </span>
        <h3 className="font-bold text-foreground">{title}</h3>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  )
}

function DailyStep({
  icon,
  period,
  title,
  description,
}: {
  icon: React.ReactNode
  period: string
  title: string
  description: string
}) {
  return (
    <div className="flex gap-3 py-5">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <div>
        <p className="text-sm font-bold text-foreground">
          <span className="mr-1.5 text-primary">{period}</span>
          {title}
        </p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
          {description}
        </p>
      </div>
    </div>
  )
}

function RegistrationRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-1 py-4 text-sm sm:grid-cols-[140px_minmax(0,1fr)] sm:items-baseline sm:gap-4">
      <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{children}</dd>
    </div>
  )
}

function FaqItem({
  question,
  answer,
}: {
  question: string
  answer: string
}) {
  return (
    <details className="group border-b border-border last:border-0">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-5 py-4 transition-colors hover:bg-secondary/40 sm:px-6 sm:py-5">
        <span className="text-sm font-semibold text-foreground sm:text-base">
          {question}
        </span>
        <ChevronDown
          className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="px-5 pb-5 text-sm leading-7 text-muted-foreground sm:px-6">
        {answer}
      </div>
    </details>
  )
}
