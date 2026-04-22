import Image from "next/image"
import Link from "next/link"

import { CopyButton } from "@/shared/components/copy-button"
import { CountUp } from "@/shared/components/count-up"
import { buttonVariants } from "@/shared/components/ui/button"
import { FOOTER_LEGAL, FOOTER_LINK_GROUPS, SITE } from "@/shared/constants/site"
import { getSiteStats } from "@/shared/lib/stats"
import { cn } from "@/shared/lib/utils"

export async function Footer() {
  const year = new Date().getFullYear()
  const phones = SITE.contact.phones.filter((p) => p.number)
  const d = SITE.donation
  const reg = SITE.registration
  const stats = await getSiteStats()
  const hasRegistration = Boolean(
    reg.representativeName || reg.shelterNumber || reg.businessNumber
  )

  return (
    <footer className="mt-auto border-t border-border/60 bg-secondary/40">
      {/* 1) 최종 CTA 배너 */}
      <section className="border-b border-border/60 bg-primary/10">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-4 py-10 text-center md:px-6 md:py-12">
          <div>
            <h3 className="text-xl font-bold text-foreground md:text-2xl">
              함께해 주세요
            </h3>
            <p className="mt-2 text-sm text-muted-foreground md:text-base">
              작은 손길 하나가 아이들의 하루를 바꿉니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/dogs"
              className={cn(buttonVariants({ size: "sm" }))}
            >
              🐶 입양 대기 보기
            </Link>
            <Link
              href="/volunteer"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              🙌 봉사 신청
            </Link>
            <Link
              href="/donate"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              🧡 후원하기
            </Link>
          </div>
        </div>
      </section>

      {/* 1.5) 활동 실적 */}
      <section className="border-b border-border/60 bg-background">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-3 gap-2 px-4 py-6 text-center md:gap-6 md:px-6 md:py-8">
          <StatItem
            label="누적 구조"
            value={stats.rescued}
            suffix="마리"
            emoji="🧡"
          />
          <StatItem
            label="입양 완료"
            value={stats.adopted}
            suffix="마리"
            emoji="🏡"
          />
          <StatItem
            label="누적 봉사자"
            value={stats.volunteers}
            suffix="명"
            emoji="🙌"
            fallbackText="모집 중"
          />
        </div>
      </section>

      {/* 2) 메인 그리드 */}
      <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6">
        <div className="grid gap-10 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src={SITE.logo}
                alt={`${SITE.name} 로고`}
                width={36}
                height={36}
                className="size-9 rounded-full"
              />
              <span className="text-lg font-bold text-foreground">
                {SITE.name}
              </span>
            </Link>

            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground/60">
              {SITE.contact.address}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              {SITE.sns.naverCafe && (
                <a
                  href={SITE.sns.naverCafe}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="네이버 카페"
                  className="flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <NaverCafeIcon className="size-4" />
                  네이버 카페
                </a>
              )}
              {SITE.sns.instagram && (
                <a
                  href={SITE.sns.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="인스타그램"
                  className="flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <InstagramIcon className="size-4" />
                  인스타그램
                </a>
              )}
              {SITE.sns.youtube && (
                <a
                  href={SITE.sns.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="유튜브"
                  className="flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  유튜브
                </a>
              )}
            </div>
          </div>

          {/* Nav groups — md+에서 2열로 펼쳐짐 */}
          <div className="md:col-span-2 grid grid-cols-2 gap-6">
            {FOOTER_LINK_GROUPS.map((group) => (
              <div key={group.title}>
                <p className="text-sm font-semibold text-foreground">
                  {group.title}
                </p>
                <ul className="mt-3 flex flex-col gap-2 text-sm">
                  {group.links.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Contact — 전화번호 하나라도 있을 때만 노출 */}
          {phones.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-foreground">연락처</p>
              <ul className="mt-3 flex flex-col gap-1.5 text-sm">
                {phones.map((p) => (
                  <li
                    key={p.label}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <span className="w-16 shrink-0 text-xs text-muted-foreground">
                      {p.label}
                    </span>
                    <a
                      href={`tel:${p.number}`}
                      className="text-foreground hover:text-primary"
                    >
                      {p.number}
                    </a>
                    <CopyButton
                      value={p.number}
                      label={`${p.label} 전화번호`}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 3) 계좌 후원 미니카드 */}
        <div className="mt-10 rounded-xl border border-primary/30 bg-primary/5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                🧡 계좌 후원
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {d.bankName}{" "}
                <span className="font-mono tracking-wide">
                  {d.accountNumber}
                </span>{" "}
                <span className="text-muted-foreground">(예금주 {d.accountHolder})</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <CopyButton value={d.accountNumber} label="계좌번호" />
              <Link
                href="/donate"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" })
                )}
              >
                후원 안내 →
              </Link>
            </div>
          </div>
        </div>

        {/* 4) 단체 정보 (해당 정보가 하나라도 있을 때만) */}
        {hasRegistration && (
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-1 border-t border-border/60 pt-6 text-xs text-muted-foreground">
            {reg.representativeName && (
              <span>대표자 {reg.representativeName}</span>
            )}
            {reg.shelterNumber && (
              <span>동물보호센터 등록번호 {reg.shelterNumber}</span>
            )}
            {reg.businessNumber && (
              <span>사업자등록번호 {reg.businessNumber}</span>
            )}
          </div>
        )}

        {/* 5) 저작권 + 약관 링크 */}
        <div
          className={cn(
            "flex flex-col gap-3 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between",
            hasRegistration
              ? "mt-4"
              : "mt-10 border-t border-border/60 pt-6"
          )}
        >
          <div>
            <p>
              © {year} {SITE.name}. All rights reserved.
            </p>
            <p className="mt-1">
              본 사이트는 유기견 보호소 {SITE.name}의 공식 홈페이지입니다.
            </p>
          </div>
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {FOOTER_LEGAL.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  )
}

function StatItem({
  label,
  value,
  suffix,
  emoji,
  fallbackText,
}: {
  label: string
  value: number
  suffix: string
  emoji: string
  fallbackText?: string
}) {
  const showFallback = value === 0 && !!fallbackText
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground md:text-xs">
        <span className="mr-1">{emoji}</span>
        {label}
      </p>
      {showFallback ? (
        <p className="mt-1 text-base font-bold text-primary md:text-lg">
          {fallbackText}
        </p>
      ) : (
        <p className="mt-1 text-xl font-bold text-foreground md:text-2xl">
          <CountUp value={value} />
          <span className="ml-0.5 text-xs font-medium text-muted-foreground">
            {suffix}
          </span>
        </p>
      )}
    </div>
  )
}

function NaverCafeIcon({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded bg-[#03C75A] text-white ${className ?? ""}`}
      aria-hidden
      style={{ fontSize: "0.6rem", fontWeight: 900, lineHeight: 1 }}
    >
      N
    </span>
  )
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect width="20" height="20" x="2" y="2" rx="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}
