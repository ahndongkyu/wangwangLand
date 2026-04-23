import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"

import { buttonVariants } from "@/shared/components/ui/button"
import { SITE } from "@/shared/constants/site"
import { cn } from "@/shared/lib/utils"

export const metadata: Metadata = {
  title: "센터 소개",
  description: `${SITE.name}는 어떤 단체이며, 어떤 가치로 활동하는지 소개합니다.`,
}

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-20">

      {/* 히어로 — 좌측 이미지 + 우측 카드 */}
      <section className="mb-16 overflow-hidden rounded-2xl border border-border bg-card shadow-sm md:grid md:grid-cols-[1fr_1fr] lg:grid-cols-[3fr_2fr]">
        {/* 이미지 */}
        <div className="relative min-h-64 md:min-h-0">
          <Image
            src="/images/about.JPG"
            alt="봉사자들과 함께하는 왕왕랜드"
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover object-center"
            priority
          />
          {/* 은은한 오버레이 */}
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.40)" }} />
          {/* 이미지 캡션 */}
          <div className="absolute bottom-5 left-5 text-white">
            <p className="text-sm font-semibold">봉사자들과 함께</p>
            <p className="mt-0.5 text-xs opacity-75">2025.11 · 왕왕랜드</p>
          </div>
        </div>

        {/* 콘텐츠 카드 */}
        <div className="flex flex-col justify-center px-8 py-10 md:px-10 md:py-12">
          <span className="text-xs font-bold tracking-widest text-primary">
            WANGWANGLAND
          </span>
          <h1 className="mt-3 text-2xl font-bold leading-snug text-foreground md:text-3xl">
            이름을 드러내지 않아도,<br />손길은 남습니다
          </h1>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            하루 두 번의 밥, 수십 번의 산책, 셀 수 없는 쓰다듬.
            누군가의 이름이 아닌 아이들의 평온으로 기억되길 바랍니다.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/volunteer" className={cn(buttonVariants({ size: "sm" }))}>
              봉사 신청하기
            </Link>
            <Link href="/donate" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              후원하기
            </Link>
          </div>
        </div>
      </section>

      {/* 섹션들 */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <InfoCard
          badge="우리의 약속"
          title="어떤 이유로도 포기하지 않아요"
          body={`${SITE.name}는 어떤 이유로도 아이들의 생명을 포기하지 않습니다. 새로운 가족을 만날 때까지, 또는 자연의 섭리로 떠나는 그 순간까지 끝까지 책임지고 돌봅니다.`}
        />
        <InfoCard
          badge="100% 안락사 없는 보호소"
          title="우리가 하는 일"
          body=""
          list={[
            "길 위에 버려진 아이들을 구조하고 안전한 보금자리를 제공합니다.",
            "건강 회복과 사회성 교육을 도와 입양 준비를 합니다.",
            "평생 가족이 되어줄 따뜻한 분들을 연결해 드립니다.",
            "입양 이후에도 아이와 가족이 잘 지내는지 소통합니다.",
          ]}
        />
        <InfoCard
          badge="함께해요"
          title="당신의 참여가 생명을 살려요"
          body="입양, 봉사, 후원 — 어떤 방법이든 좋습니다. 작은 마음 하나하나가 한 생명을 살립니다."
          className="md:col-span-2 lg:col-span-1"
        />
      </div>

      <p className="mt-12 text-xs text-muted-foreground/60">
        * 세부 내용은 단체 승격 완료 후 공식 문구로 갱신됩니다.
      </p>
    </div>
  )
}

function InfoCard({
  badge,
  title,
  body,
  list,
  className,
}: {
  badge: string
  title: string
  body: string
  list?: string[]
  className?: string
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-6", className)}>
      <span className="text-[11px] font-bold tracking-widest text-primary uppercase">
        {badge}
      </span>
      <h2 className="mt-2 text-lg font-bold text-foreground">{title}</h2>
      {body && (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
      )}
      {list && (
        <ul className="mt-3 space-y-2">
          {list.map((item) => (
            <li key={item} className="flex gap-2 text-sm text-muted-foreground">
              <span className="mt-0.5 shrink-0 text-primary">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
