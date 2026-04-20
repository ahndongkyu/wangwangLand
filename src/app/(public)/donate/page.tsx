import type { Metadata } from "next"

import { SITE } from "@/shared/constants/site"

export const metadata: Metadata = {
  title: "후원 안내",
  description: `${SITE.name}은 여러분의 후원으로 운영됩니다. 계좌 이체로 참여하실 수 있습니다.`,
}

export default function DonatePage() {
  const hasAccount = SITE.donation.bankName && SITE.donation.accountNumber

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 md:px-6 md:py-16">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-foreground md:text-4xl">
          후원 안내
        </h1>
        <p className="mt-3 text-muted-foreground">
          {SITE.name}은 여러분의 따뜻한 마음으로 운영됩니다.
          <br />
          작은 정성이 아이들의 한 끼, 한 번의 진료가 됩니다.
        </p>
      </header>

      <section className="mb-10">
        <h2 className="mb-4 text-xl font-semibold text-foreground">
          후원금은 이렇게 쓰여요
        </h2>
        <ul className="grid gap-3 md:grid-cols-2">
          <UsageItem emoji="🍖" title="사료 · 간식" desc="아이들의 한 끼" />
          <UsageItem emoji="🏥" title="의료비" desc="예방 접종, 치료, 수술" />
          <UsageItem emoji="🏠" title="보호 환경" desc="시설 유지 및 개선" />
          <UsageItem
            emoji="💙"
            title="구조 활동"
            desc="버려진 아이들을 찾아가는 비용"
          />
        </ul>
      </section>

      <section className="rounded-xl border border-primary/40 bg-primary/5 p-6">
        <h2 className="mb-4 text-xl font-semibold text-foreground">
          계좌 후원
        </h2>
        {hasAccount ? (
          <div className="space-y-2 text-sm md:text-base">
            <Row label="은행" value={SITE.donation.bankName} />
            <Row label="계좌번호" value={SITE.donation.accountNumber} />
            <Row label="예금주" value={SITE.donation.accountHolder} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            계좌 정보는 곧 공개됩니다. 문의 주시면 안내드리겠습니다.
          </p>
        )}
      </section>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        * 정기 후원 및 카드/간편 결제는 추후 지원 예정입니다.
      </p>
    </div>
  )
}

function UsageItem({
  emoji,
  title,
  desc,
}: {
  emoji: string
  title: string
  desc: string
}) {
  return (
    <li className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
      <span className="text-2xl">{emoji}</span>
      <div>
        <p className="font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
      </div>
    </li>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-4">
      <span className="w-20 text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}
