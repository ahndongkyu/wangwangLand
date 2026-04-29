import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"
import {
  Calendar,
  ChevronDown,
  Hand,
  HeartHandshake,
  Home as HomeIcon,
  Mail,
  MapPin,
  PawPrint,
  Phone,
  ShieldCheck,
  Sprout,
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

export const revalidate = 3600

export default async function AboutPage() {
  const stats = await getSiteStats()
  const phones = SITE.contact.phones.filter((p) => p.number)

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-20">
      {/* 1. 히어로 */}
      <section className="mb-10 overflow-hidden rounded-2xl border border-border bg-card shadow-sm md:grid md:grid-cols-[1fr_1fr] lg:grid-cols-[3fr_2fr]">
        <div className="relative min-h-64 md:min-h-0">
          <Image
            src="/images/about.jpg"
            alt="봉사자들과 함께하는 왕왕랜드"
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>
        <div className="flex flex-col justify-center px-8 py-10 md:px-10 md:py-12">
          <span className="text-xs font-bold tracking-widest text-primary">
            WANGWANGLAND
          </span>
          <h1 className="mt-3 text-2xl font-bold leading-snug text-foreground md:text-3xl">
            이름을 드러내지 않아도,
            <br />
            손길은 남습니다
          </h1>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            하루 두 번의 밥, 수십 번의 산책, 셀 수 없는 쓰다듬.
            누군가의 이름이 아닌 아이들의 평온으로 기억되길 바랍니다.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/volunteer" className={cn(buttonVariants())}>
              봉사 신청하기
            </Link>
            <Link
              href="/donate"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              후원하기
            </Link>
          </div>
        </div>
      </section>

      {/* 2. 임팩트 통계 */}
      <section className="mb-12 grid grid-cols-2 gap-3 md:grid-cols-4">
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
          fallback="모집 중"
        />
      </section>

      {/* 3. 우리의 미션 — 3단 카드 */}
      <section className="mb-12">
        <header className="mb-6">
          <span className="text-[11px] font-bold tracking-widest text-primary uppercase">
            OUR MISSION
          </span>
          <h2 className="mt-1 text-2xl font-bold text-foreground md:text-3xl">
            왕왕랜드가 하는 일
          </h2>
        </header>
        <div className="grid gap-4 md:grid-cols-3">
          <MissionCard
            icon={<ShieldCheck className="size-5" aria-hidden />}
            badge="우리의 약속"
            title="어떤 이유로도 포기하지 않아요"
            body={`${SITE.name}는 어떤 이유로도 아이들의 생명을 포기하지 않습니다. 새로운 가족을 만날 때까지, 또는 자연의 섭리로 떠나는 그 순간까지 끝까지 책임지고 돌봅니다.`}
          />
          <MissionCard
            icon={<PawPrint className="size-5" aria-hidden />}
            badge="100% 안락사 없는 보호소"
            title="우리가 하는 일"
            list={[
              "아이들을 구조하고 건강·사회성을 회복시킵니다.",
              "평생 가족이 되어줄 따뜻한 분들과 연결합니다.",
              "입양 후에도 아이와 가족이 잘 지내는지 함께 소통합니다.",
            ]}
          />
          <MissionCard
            icon={<Hand className="size-5" aria-hidden />}
            badge="함께해요"
            title="당신의 참여가 생명을 살려요"
            body={
              "입양, 봉사, 후원 어떤 방법이든 좋습니다.\n작은 마음 하나하나가 한 생명을 살립니다."
            }
          />
        </div>
      </section>

      {/* 4. 오시는 길 / 연락처 */}
      <section className="mb-12 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="grid gap-0 md:grid-cols-[1fr_1fr]">
          {/* 좌측 — 위치 정보 */}
          <div className="px-6 py-8 md:px-8 md:py-10">
            <span className="text-[11px] font-bold tracking-widest text-primary uppercase">
              VISIT US
            </span>
            <h2 className="mt-1 text-2xl font-bold text-foreground md:text-3xl">
              오시는 길
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              방문 전 봉사 신청 또는 입양 문의 폼을 먼저 작성해 주세요.
            </p>

            <dl className="mt-6 space-y-4 text-sm">
              <Row
                icon={<MapPin className="size-4" aria-hidden />}
                label="주소"
              >
                <div className="flex items-start gap-2">
                  <span className="flex-1">{SITE.contact.address}</span>
                  <CopyButton
                    value={SITE.contact.address}
                    label="주소"
                  />
                </div>
                {SITE.contact.addressNote && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {SITE.contact.addressNote}
                  </p>
                )}
              </Row>
              {phones.length > 0 && (
                <Row
                  icon={<Phone className="size-4" aria-hidden />}
                  label="연락처"
                >
                  <ul className="space-y-1">
                    {phones.map((p) => (
                      <li key={p.label} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {p.label}
                        </span>
                        <a
                          href={`tel:${p.number}`}
                          className="text-primary hover:underline"
                        >
                          {p.number}
                        </a>
                      </li>
                    ))}
                  </ul>
                </Row>
              )}
              {SITE.contact.email && (
                <Row
                  icon={<Mail className="size-4" aria-hidden />}
                  label="이메일"
                >
                  <a
                    href={`mailto:${SITE.contact.email}`}
                    className="text-primary hover:underline"
                  >
                    {SITE.contact.email}
                  </a>
                </Row>
              )}
            </dl>

            <div className="mt-6 flex flex-wrap gap-2">
              <a
                href={`https://map.naver.com/v5/search/${encodeURIComponent(SITE.contact.mapQuery || SITE.contact.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "gap-1.5"
                )}
              >
                <MapPin className="size-3.5" aria-hidden />
                네이버 지도
              </a>
              <a
                href={`https://map.kakao.com/?q=${encodeURIComponent(SITE.contact.mapQuery || SITE.contact.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "gap-1.5"
                )}
              >
                <MapPin className="size-3.5" aria-hidden />
                카카오 지도
              </a>
            </div>
          </div>

          {/* 우측 — 지도 placeholder (네이버 지도 정적 이미지 / iframe 가능) */}
          <div className="relative min-h-64 bg-secondary/40 md:min-h-0">
            <iframe
              src={`https://map.kakao.com/?q=${encodeURIComponent(SITE.contact.mapQuery || SITE.contact.address)}`}
              className="absolute inset-0 size-full"
              loading="lazy"
              title="왕왕랜드 위치"
            />
            <noscript>
              <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
                지도를 보려면 자바스크립트를 활성화하세요.
              </div>
            </noscript>
          </div>
        </div>
      </section>

      {/* 5. FAQ */}
      <section className="mb-12">
        <header className="mb-6">
          <span className="text-[11px] font-bold tracking-widest text-primary uppercase">
            FAQ
          </span>
          <h2 className="mt-1 text-2xl font-bold text-foreground md:text-3xl">
            자주 묻는 질문
          </h2>
        </header>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <FaqItem
            q="입양은 어떻게 진행되나요?"
            a={
              "1) 강아지·고양이 페이지에서 만나고 싶은 아이를 보고 [입양 문의] 버튼 클릭\n2) 폼 작성 → 운영진이 검토 후 연락\n3) 통화·방문 상담 → 가정 점검 → 입양 확정\n\n무책임한 입양을 막기 위해 가족 동의·주거 환경 등을 확인합니다. 입양 후에도 아이의 근황을 함께 나눠주세요."
            }
          />
          <FaqItem
            q="봉사는 누구나 신청할 수 있나요?"
            a={
              "만 14세 이상이면 누구나 신청 가능합니다. 단체·기업 봉사도 환영합니다. 신청 후 운영진이 일정을 조율해 안내드립니다.\n\n주요 활동: 산책, 목욕·미용, 청소·정리, 홍보·촬영"
            }
          />
          <FaqItem
            q="후원금은 어떻게 사용되나요?"
            a={
              "사료·간식 구매, 병원비(예방접종·중성화·치료), 시설 유지(전기·수도·청소), 운영비(소모품) 순으로 사용됩니다. 정기 결산 공개를 준비 중입니다."
            }
          />
          <FaqItem
            q="기부금영수증 발급이 가능한가요?"
            a={
              "현재는 공익성 단체 등록 전이라 영수증 발급이 어렵습니다. 후원 기록은 모두 보관 중이며, 등록 완료 후 가장 먼저 안내드리겠습니다."
            }
          />
          <FaqItem
            q="임시보호도 가능한가요?"
            a={
              "네, 가능합니다. 입양 전 단계로 일정 기간 가정에서 돌봐주는 형태입니다. 사료·기본 용품은 단체에서 지원하며, 자세한 조건은 운영진과 상담 후 결정합니다."
            }
          />
        </div>
      </section>

      {/* 6. 단체 신뢰 정보 */}
      <section className="rounded-2xl border border-border bg-card px-6 py-7 md:px-8 md:py-8">
        <header className="mb-4 flex items-center gap-2">
          <ShieldCheck className="size-5 text-primary" aria-hidden />
          <h2 className="text-base font-bold text-foreground">단체 정보</h2>
        </header>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          {SITE.registration.taxId && (
            <RegistrationRow label="고유번호">
              {SITE.registration.taxId}
              <span className="ml-1.5 text-[11px] text-muted-foreground">
                (수익사업을 하지 않는 비영리법인)
              </span>
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
              비영리 동물 보호 단체 (공익성 등록 준비 중)
            </span>
          </RegistrationRow>
        </dl>
      </section>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  suffix,
  fallback,
}: {
  icon: React.ReactNode
  label: string
  value: number
  suffix: string
  fallback?: string
}) {
  const showFallback = value === 0 && !!fallback
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-center transition-colors hover:border-primary/40">
      <span className="mx-auto mb-2 flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </span>
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      {showFallback ? (
        <p className="mt-1 text-2xl font-bold text-primary">{fallback}</p>
      ) : (
        <p className="mt-1 text-2xl font-bold text-foreground">
          {value.toLocaleString()}
          <span className="ml-0.5 text-sm font-medium text-muted-foreground">
            {suffix}
          </span>
        </p>
      )}
    </div>
  )
}

function MissionCard({
  icon,
  badge,
  title,
  body,
  list,
}: {
  icon: React.ReactNode
  badge: string
  title: string
  body?: string
  list?: string[]
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/40">
      <span className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="text-[11px] font-bold tracking-widest text-primary uppercase">
        {badge}
      </span>
      <h3 className="mt-1 text-lg font-bold text-foreground">{title}</h3>
      {body && (
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
          {body}
        </p>
      )}
      {list && (
        <ul className="mt-3 space-y-2.5">
          {list.map((item) => (
            <li key={item} className="flex gap-2 text-sm text-muted-foreground">
              <span className="mt-0.5 shrink-0 text-primary">✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 text-foreground">{children}</dd>
    </div>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="group border-b border-border last:border-0">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-5 py-4 transition-colors hover:bg-secondary/40">
        <span className="text-sm font-semibold text-foreground sm:text-base">
          {q}
        </span>
        <ChevronDown
          className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="px-5 pb-4 text-sm leading-relaxed text-muted-foreground sm:text-[13px]">
        <p className="whitespace-pre-line">{a}</p>
      </div>
    </details>
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
    <div className="flex items-baseline gap-3">
      <dt className="w-32 shrink-0 text-xs font-semibold text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  )
}
