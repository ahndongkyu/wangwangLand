import type { Metadata } from "next"

import { SITE } from "@/shared/constants/site"

export const metadata: Metadata = {
  title: "개인정보처리방침",
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 md:px-6 md:py-16">
      <h1 className="mb-8 text-3xl font-bold text-foreground md:text-4xl">
        개인정보처리방침
      </h1>
      <div className="prose prose-sm max-w-none space-y-6 text-foreground/90">
        <p>
          {SITE.name}(이하 "단체")은(는) 「개인정보 보호법」 등 관련 법령을
          준수하며, 이용자의 개인정보를 중요하게 생각합니다.
        </p>

        <Section title="1. 수집하는 개인정보 항목">
          <ul className="list-disc pl-5 space-y-1">
            <li>입양 신청: 이름, 연락처, 이메일, 주소, 가족/주거 정보, 반려 경험, 입양 사유</li>
            <li>봉사 신청: 이름, 연락처, 이메일, 가능 요일·시간, 희망 활동</li>
          </ul>
        </Section>

        <Section title="2. 수집 및 이용 목적">
          <ul className="list-disc pl-5 space-y-1">
            <li>입양·봉사 상담 및 연락</li>
            <li>단체 활동 공지 및 결과 회신</li>
          </ul>
        </Section>

        <Section title="3. 개인정보 보유 및 이용 기간">
          <p>
            수집된 개인정보는 상담 종료 또는 활동 완료 후 1년간 보관되며, 그 후
            안전하게 파기됩니다. 관련 법령에 따라 보존이 필요한 경우 해당
            기간까지 보관할 수 있습니다.
          </p>
        </Section>

        <Section title="4. 제3자 제공">
          <p>
            단체는 이용자의 개인정보를 외부에 제공하지 않습니다. 단, 법령에 근거가
            있는 경우는 예외입니다.
          </p>
        </Section>

        <Section title="5. 문의처">
          <p>
            개인정보 관련 문의는 {SITE.contact.email || "운영진 이메일"}로
            연락해 주시기 바랍니다.
          </p>
        </Section>

        <p className="text-sm text-muted-foreground">
          * 본 방침은 단체 등록 완료 후 공식 문구로 갱신됩니다.
        </p>
      </div>
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
    <section>
      <h2 className="mb-2 text-lg font-semibold text-foreground">{title}</h2>
      <div>{children}</div>
    </section>
  )
}
