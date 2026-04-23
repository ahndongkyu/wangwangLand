import type { Metadata } from "next"

import { SITE } from "@/shared/constants/site"

export const metadata: Metadata = {
  title: "센터 소개",
  description: `${SITE.name}는 어떤 단체이며, 어떤 가치로 활동하는지 소개합니다.`,
}

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 md:px-6 md:py-16">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-foreground md:text-4xl">
          {SITE.name} 소개
        </h1>
        <p className="mt-3 text-muted-foreground">{SITE.tagline}</p>
      </header>

      <Section title="우리의 약속">
        <p>
          {SITE.name}는 어떤 이유로도 아이들의 생명을 포기하지 않습니다. 새로운
          가족을 만날 때까지, 또는 아이들이 자연의 섭리로 떠나는 그 순간까지,
          끝까지 책임지고 돌봅니다.
        </p>
      </Section>

      <Section title="우리가 하는 일">
        <ul className="space-y-2">
          <Li>길 위에 버려진 아이들을 구조하고 안전한 보금자리를 제공합니다.</Li>
          <Li>건강 회복과 사회성 교육을 도와 입양 준비를 합니다.</Li>
          <Li>평생 가족이 되어줄 따뜻한 분들을 연결해 드립니다.</Li>
          <Li>입양 이후에도 아이와 가족이 잘 지내는지 소통합니다.</Li>
        </ul>
      </Section>

      <p className="mt-10 text-sm text-muted-foreground">
        * 이 페이지의 세부 내용은 단체 승격 완료 후 공식 문구로 갱신됩니다.
      </p>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-xl font-semibold text-foreground">{title}</h2>
      <div className="text-muted-foreground leading-relaxed">{children}</div>
    </section>
  )
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="text-primary">•</span>
      <span>{children}</span>
    </li>
  )
}
