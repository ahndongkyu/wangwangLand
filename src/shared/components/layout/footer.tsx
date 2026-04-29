import Image from "next/image"
import Link from "next/link"

import { BrandIcon } from "@/shared/components/brand-icon"
import { CopyButton } from "@/shared/components/copy-button"
import { buttonVariants } from "@/shared/components/ui/button"
import { FOOTER_LEGAL, FOOTER_LINK_GROUPS, SITE } from "@/shared/constants/site"
import { cn } from "@/shared/lib/utils"

export function Footer() {
  const year = new Date().getFullYear()
  const phones = SITE.contact.phones.filter((p) => p.number)
  const d = SITE.donation
  const reg = SITE.registration
  const hasRegistration = Boolean(
    reg.representativeName || reg.shelterNumber || reg.businessNumber
  )

  return (
    <footer className="mt-auto border-t border-border/60 bg-secondary/40">
      {/* 0) 통합 후원 CTA 카드 */}
      <section className="border-b border-border/60 px-4 py-10 md:px-6 md:py-12">
        <div
          className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-2xl px-5 py-7 sm:px-8 sm:py-9 md:px-12 md:py-10
            bg-[linear-gradient(135deg,#FCE9D9_0%,#F5E1C8_100%)]
            dark:bg-[linear-gradient(135deg,#523619_0%,#2D1D11_100%)]"
        >
          {/* 배경 데코 원 2개 */}
          <span className="pointer-events-none absolute -right-8 -top-8 size-36 rounded-full bg-[rgba(232,155,94,0.12)] dark:bg-[rgba(232,155,94,0.18)]" />
          <span className="pointer-events-none absolute right-20 top-7 size-12 rounded-full bg-[rgba(255,212,161,0.25)] dark:bg-[rgba(255,212,161,0.15)]" />

          {/* 좌우 분할: 모바일 1단 → 데스크탑 2단 */}
          <div className="relative z-10 grid grid-cols-1 gap-6 md:grid-cols-[1fr_1.3fr] md:items-center md:gap-10">

            {/* 왼쪽: 라벨 + 헤드라인 + 설명 */}
            <div className="self-center">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-sm
                  bg-white text-[#C06B2A]
                  dark:bg-[rgba(255,212,161,0.15)] dark:text-[#FFD4A1] dark:shadow-none"
              >
                <BrandIcon name="heart" size={13} decorative />
                함께해 주세요
              </span>
              <h3
                className="mt-4 text-xl font-bold leading-snug md:text-3xl
                  text-[#2C2C2A] dark:text-[#F5EDE0]"
              >
                한 그릇의 사료가<br />한 생명을 살립니다
              </h3>
              <p
                className="mt-2 text-sm leading-relaxed
                  text-[#6B5D4F] dark:text-[#B8A78F]"
              >
                왕왕랜드의 100여 마리 아이들이<br />
                매일 밥과 약, 따뜻한 잠자리를 기다려요.
              </p>
            </div>

            {/* 오른쪽: 계좌 박스 + 버튼 */}
            <div className="flex flex-col gap-3">
              {/* 계좌 정보 박스 */}
              <div
                className="rounded-2xl px-4 py-4
                  bg-white shadow-[0_2px_8px_rgba(60,40,20,0.04)]
                  dark:bg-black/25 dark:shadow-none"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-medium tracking-wide text-[#9B8F80] dark:text-[#B8A78F]">
                    계좌 후원
                  </span>
                  <span className="text-[11px] text-[#9B8F80] dark:text-[#B8A78F]">
                    예금주 · {d.accountHolder}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="shrink-0 rounded-md px-2 py-1 text-[11px] font-medium
                      bg-[#FAF3E8] text-[#6B5D4F]
                      dark:bg-[rgba(255,212,161,0.1)] dark:text-[#FFD4A1]"
                  >
                    {d.bankName}
                  </span>
                  <span
                    className="min-w-0 flex-1 truncate font-mono text-[13px] font-semibold tracking-wide sm:text-[15px]
                      text-[#2C2C2A] dark:text-[#F5EDE0]"
                  >
                    {d.accountNumber}
                  </span>
                  <CopyButton value={d.accountNumber} label="계좌번호" />
                </div>
              </div>

              {/* 버튼 2개 */}
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <Link
                  href="/donate"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl py-3.5 text-sm font-semibold transition-all hover:-translate-y-px
                    bg-[#E89B5E] text-white shadow-[0_4px_12px_rgba(232,155,94,0.3)] hover:shadow-[0_6px_16px_rgba(232,155,94,0.4)]
                    dark:text-[#2C2C2A]"
                >
                  <BrandIcon name="heart" size={16} decorative className="brightness-0 invert dark:invert-0" />
                  후원하기
                </Link>
                <Link
                  href="/donate"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border-[1.5px] py-3.5 text-sm font-semibold transition-all hover:-translate-y-px
                    bg-white border-[#E89B5E] text-[#C06B2A] hover:bg-[#E89B5E] hover:text-white
                    dark:bg-[rgba(255,212,161,0.08)] dark:border-[rgba(255,212,161,0.4)] dark:text-[#FFD4A1] dark:hover:bg-[#E89B5E] dark:hover:text-[#2C2C2A]"
                >
                  <BrandIcon name="heart" size={16} decorative />
                  물품 후원하기
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2) 메인 그리드 — 4열: 브랜드 / 아이들 만나기 / 함께하기 / 정보 */}
      <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6">
        <div className="grid grid-cols-2 gap-5 md:grid-cols-4 md:gap-8">
          {/* 브랜드 */}
          <div className="col-span-2 md:col-span-1">
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

            {/* 주소 카드 */}
            <div className="mt-4 rounded-lg border border-border bg-card px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
              <p>{SITE.contact.addressShort}</p>
              <p>유기견보호소 왕왕랜드</p>
            </div>

            {/* SNS 아이콘 — 36px 정사각형 */}
            <div className="mt-4 flex items-center gap-2">
              {SITE.sns.naverCafe && (
                <a
                  href={SITE.sns.naverCafe}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="네이버 카페"
                  className="flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <NaverCafeIcon className="size-4" />
                </a>
              )}
              {SITE.sns.instagram && (
                <a
                  href={SITE.sns.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="인스타그램"
                  className="flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <InstagramIcon className="size-4" />
                </a>
              )}
              {SITE.sns.youtube && (
                <a
                  href={SITE.sns.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="유튜브"
                  className="flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <YouTubeIcon className="size-4" />
                </a>
              )}
            </div>
          </div>

          {/* 아이들 만나기 */}
          <NavGroup group={FOOTER_LINK_GROUPS[0]} />

          {/* 함께하기 */}
          <NavGroup group={FOOTER_LINK_GROUPS[1]} />

          {/* 정보 + 연락처 */}
          <div>
            <NavGroup group={FOOTER_LINK_GROUPS[2]} />
            {phones.length > 0 && (
              <div className="mt-6">
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
        </div>

        {/* 단체 정보 */}
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

        {/* 저작권 + 약관 링크 */}
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

function NavGroup({
  group,
}: {
  group: (typeof FOOTER_LINK_GROUPS)[number]
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-foreground">{group.title}</p>
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

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M23 7s-.3-2-1.2-2.8c-1.1-1.2-2.4-1.2-3-1.3C16.4 2.8 12 2.8 12 2.8s-4.4 0-6.8.1c-.6.1-1.9.1-3 1.3C1.3 5 1 7 1 7S.7 9.2.7 11.5v2.1c0 2.3.3 4.5.3 4.5s.3 2 1.2 2.8c1.1 1.2 2.6 1.1 3.3 1.2C7.5 22.2 12 22.2 12 22.2s4.4 0 6.8-.2c.6-.1 1.9-.1 3-1.2.9-.8 1.2-2.8 1.2-2.8s.3-2.2.3-4.5v-2.1C23.3 9.2 23 7 23 7zM9.7 15.5V8.4l8.1 3.6-8.1 3.5z" />
    </svg>
  )
}
