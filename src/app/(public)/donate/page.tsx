import Link from "next/link"
import type { Metadata } from "next"
import { Heart, Home, Stethoscope, UtensilsCrossed, type LucideIcon } from "lucide-react"

import { BrandIcon } from "@/shared/components/brand-icon"
import { CopyButton } from "@/shared/components/copy-button"
import { buttonVariants } from "@/shared/components/ui/button"
import { SITE } from "@/shared/constants/site"
import { cn } from "@/shared/lib/utils"

export const metadata: Metadata = {
  title: "후원 안내",
  description: `${SITE.name}은 여러분의 후원으로 운영됩니다. 계좌 이체와 후원품으로 참여하실 수 있습니다.`,
}

export default function DonatePage() {
  const d = SITE.donation

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
          <UsageItem Icon={UtensilsCrossed} title="사료 · 간식" desc="아이들의 한 끼" />
          <UsageItem Icon={Stethoscope} title="의료비" desc="예방 접종, 치료, 수술" />
          <UsageItem Icon={Home} title="보호 환경" desc="시설 유지 및 개선" />
          <UsageItem Icon={Heart} title="구조 활동" desc="버려진 아이들을 찾아가는 비용" />
        </ul>
      </section>

      <section className="mb-10 rounded-xl border border-primary/40 bg-primary/5 p-6">
        <div className="mb-5 flex items-baseline justify-between gap-2">
          <h2 className="text-xl font-semibold text-foreground">계좌 후원</h2>
          <span className="text-xs text-muted-foreground">일시·정기 후원 공용</span>
        </div>

        <div className="space-y-2 text-sm md:text-base">
          <Row label="은행" value={d.bankName} />
          <Row
            label="계좌번호"
            value={
              <span className="flex flex-wrap items-center gap-2">
                <span className="select-all font-mono tracking-wide">
                  {d.accountNumber}
                </span>
                <CopyButton
                  value={d.accountNumber}
                  label="계좌번호"
                />
              </span>
            }
          />
          <Row label="예금주" value={d.accountHolder} />
        </div>

        <div className="mt-5 rounded-lg bg-background/70 p-4 text-sm text-foreground/90">
          <p className="flex items-center gap-1.5 font-semibold text-foreground">
            <BrandIcon name="heart" size={20} decorative />
            정기 후원 안내
          </p>
          <p className="mt-1.5 leading-relaxed text-muted-foreground">
            월 <span className="font-semibold text-foreground">
              {d.regularMinimum.toLocaleString()}원
            </span>부터 자유롭게 책정하실 수 있습니다. 위 {d.bankName} 계좌로
            자동이체를 등록해 주세요.
          </p>
        </div>
      </section>

      <section className="mb-10 rounded-xl border border-border bg-card p-6">
        <h2 className="mb-3 text-xl font-semibold text-foreground">
          후원품 택배
        </h2>
        <p className="mb-3 text-sm text-muted-foreground">
          사료·간식·담요·장난감 등 후원물품은 아래 주소로 보내 주세요.
        </p>
        <div className="rounded-lg bg-background px-4 py-3 text-sm">
          <div className="flex flex-wrap items-start gap-2">
            <p className="flex-1 font-semibold text-foreground">
              {d.parcelAddress}
            </p>
            <CopyButton
              value={d.parcelAddressShort}
              label="주소"
            />
          </div>
          {d.parcelAddressNote && (
            <p className="mt-1 text-xs text-muted-foreground">
              ※ {d.parcelAddressNote}
            </p>
          )}
        </div>
      </section>

      {/* 후원 등록 안내 */}
      <section className="mb-6 rounded-xl border border-primary/40 bg-card p-6 text-center">
        <p className="text-sm font-semibold text-foreground">
          🌱 후원해주신 분, 잠시만요!
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          입금/물품 발송 후 아래 폼에 등록해주시면
          <br />
          기록으로 보관하고, 추후 영수증 발급이 가능해지면 가장 먼저 안내드립니다.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Link href="/donate/register" className={cn(buttonVariants())}>
            후원 등록하기
          </Link>
          <Link
            href="/my/donations"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            내 후원 내역
          </Link>
        </div>
      </section>

      <p className="text-center text-xs text-muted-foreground">
        * 카드·간편 결제 연동은 추후 지원 예정입니다.
      </p>
    </div>
  )
}

function UsageItem({
  Icon,
  title,
  desc,
}: {
  Icon: LucideIcon
  title: string
  desc: string
}) {
  return (
    <li className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-5" aria-hidden />
      </span>
      <div>
        <p className="font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
      </div>
    </li>
  )
}

function Row({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-4">
      <span className="w-20 shrink-0 text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}
