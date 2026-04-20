import type { Metadata } from "next"

import { SITE } from "@/shared/constants/site"

export const metadata: Metadata = {
  title: "이용약관",
}

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 md:px-6 md:py-16">
      <h1 className="mb-8 text-3xl font-bold text-foreground md:text-4xl">
        이용약관
      </h1>
      <div className="space-y-6 text-foreground/90">
        <Section title="제1조 (목적)">
          <p>
            본 약관은 {SITE.name}(이하 "단체")이 제공하는 웹사이트 서비스의
            이용에 관한 사항을 규정함을 목적으로 합니다.
          </p>
        </Section>

        <Section title="제2조 (이용자의 의무)">
          <p>
            이용자는 관련 법령과 본 약관의 규정, 안내사항 등 단체가 통지하는
            사항을 준수해야 합니다. 단체의 활동을 방해하거나 명예를 훼손하는
            행위는 금지됩니다.
          </p>
        </Section>

        <Section title="제3조 (입양 및 봉사 신청)">
          <p>
            입양 및 봉사 신청은 단순 접수 단계이며, 실제 참여 여부는 운영진의
            상담과 검토를 거쳐 결정됩니다. 허위 정보 제출은 신청 취소 및
            향후 참여 제한의 사유가 될 수 있습니다.
          </p>
        </Section>

        <Section title="제4조 (면책)">
          <p>
            단체는 천재지변, 서비스 장애 등 불가항력적 사유로 인한 서비스 중단에
            대해 책임을 지지 않습니다.
          </p>
        </Section>

        <Section title="제5조 (약관 변경)">
          <p>
            본 약관은 관련 법령 또는 운영상 필요에 따라 변경될 수 있으며, 변경
            시 웹사이트를 통해 사전 공지합니다.
          </p>
        </Section>

        <p className="text-sm text-muted-foreground">
          * 본 약관은 단체 등록 완료 후 공식 문구로 갱신됩니다.
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
