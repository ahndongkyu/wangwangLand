import Image from "next/image"
import Link from "next/link"
import { MapPin, Phone } from "lucide-react"

import { CopyButton } from "@/shared/components/copy-button"
import { buttonVariants } from "@/shared/components/ui/button"
import { FOOTER_LINK_GROUPS, SITE } from "@/shared/constants/site"
import { cn } from "@/shared/lib/utils"

export function Footer() {
  const year = new Date().getFullYear()
  const phones = SITE.contact.phones.filter((p) => p.number)
  const d = SITE.donation

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
              💙 후원하기
            </Link>
          </div>
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
            <p className="mt-3 text-sm text-muted-foreground">
              {SITE.subtitle}
            </p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {SITE.description}
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

          {/* Contact */}
          <div>
            <p className="text-sm font-semibold text-foreground">연락처</p>
            <ul className="mt-3 flex flex-col gap-3 text-sm">
              {phones.length > 0 && (
                <li>
                  <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Phone className="size-3.5" aria-hidden />
                    전화
                  </div>
                  <ul className="mt-1.5 flex flex-col gap-1.5">
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
                </li>
              )}

              {SITE.contact.address && (
                <li>
                  <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <MapPin className="size-3.5" aria-hidden />
                    주소
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-start gap-2">
                    <p className="flex-1 text-foreground">
                      {SITE.contact.address}
                    </p>
                    <CopyButton
                      value={SITE.contact.addressShort}
                      label="주소"
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                    <a
                      href={`https://map.kakao.com/?q=${encodeURIComponent(SITE.contact.mapQuery)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-border bg-card px-2.5 py-0.5 text-muted-foreground hover:border-primary hover:text-primary"
                    >
                      카카오맵
                    </a>
                    <a
                      href={`https://map.naver.com/p/search/${encodeURIComponent(SITE.contact.mapQuery)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-border bg-card px-2.5 py-0.5 text-muted-foreground hover:border-primary hover:text-primary"
                    >
                      네이버지도
                    </a>
                    <a
                      href={`https://www.google.com/maps/search/${encodeURIComponent(SITE.contact.mapQuery)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-border bg-card px-2.5 py-0.5 text-muted-foreground hover:border-primary hover:text-primary"
                    >
                      구글맵
                    </a>
                  </div>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* 3) 계좌 후원 미니카드 */}
        <div className="mt-10 rounded-xl border border-primary/30 bg-primary/5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                💙 계좌 후원
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

        {/* 4) 저작권 */}
        <div className="mt-10 border-t border-border/60 pt-6 text-xs text-muted-foreground">
          <p>
            © {year} {SITE.name}. All rights reserved.
          </p>
          <p className="mt-1">
            본 사이트는 유기견 보호소 {SITE.name}의 공식 홈페이지입니다.
          </p>
        </div>
      </div>
    </footer>
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
