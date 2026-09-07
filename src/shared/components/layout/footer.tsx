import Image from "next/image"
import Link from "next/link"

import { CopyButton } from "@/shared/components/copy-button"
import { FOOTER_LEGAL, FOOTER_LINK_GROUPS, SITE } from "@/shared/constants/site"
import { cn } from "@/shared/lib/utils"

export function Footer() {
  const year = new Date().getFullYear()
  const phones = SITE.contact.phones.filter((p) => p.number)
  const reg = SITE.registration
  const hasRegistration = Boolean(
    reg.representativeName || reg.shelterNumber || reg.taxId
  )

  return (
    <footer className="mt-auto border-t border-border bg-[linear-gradient(110deg,var(--secondary)_0%,var(--accent)_100%)] text-foreground/80">
      <div className="mx-auto w-full max-w-[1440px] px-8 py-10 2xl:px-12">
        <div className="grid grid-cols-2 gap-7 lg:grid-cols-4 lg:gap-10">
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
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              {SITE.subtitle}
            </p>
            <div className="mt-4 rounded-xl border border-border bg-card/75 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
              <p>{SITE.contact.addressShort}</p>
              <p>유기견보호소 왕왕랜드</p>
            </div>
            <div className="mt-4 flex items-center gap-2">
              {SITE.sns.kakaoChannel && (
                <a
                  href={SITE.sns.kakaoChannel}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="카카오톡 문의"
                  className="flex size-9 items-center justify-center rounded-lg border border-[#F0D900] bg-[#FEE500] text-[#3C1E1E] transition-all hover:-translate-y-0.5 hover:bg-[#FFEA32]"
                >
                  <KakaoIcon className="size-4" />
                </a>
              )}
              {SITE.sns.naverCafe && (
                <a
                  href={SITE.sns.naverCafe}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="네이버 카페"
                  className="flex size-9 items-center justify-center rounded-lg border border-border bg-card/75 text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card hover:text-primary"
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
                  className="flex size-9 items-center justify-center rounded-lg border border-border bg-card/75 text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card hover:text-primary"
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
                  className="flex size-9 items-center justify-center rounded-lg border border-border bg-card/75 text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card hover:text-primary"
                >
                  <YouTubeIcon className="size-4" />
                </a>
              )}
            </div>
          </div>

          <NavGroup group={FOOTER_LINK_GROUPS[0]} />
          <NavGroup group={FOOTER_LINK_GROUPS[1]} />
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
                        className="text-foreground/80 transition-colors hover:text-primary"
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

        {hasRegistration && (
          <div className="mt-9 flex flex-wrap gap-x-6 gap-y-1 border-t border-border pt-5 text-xs text-muted-foreground">
            {reg.representativeName && (
              <span>대표자 {reg.representativeName}</span>
            )}
            {reg.shelterNumber && (
              <span>동물보호센터 등록번호 {reg.shelterNumber}</span>
            )}
            {reg.taxId && <span>고유번호 {reg.taxId}</span>}
          </div>
        )}

        <div
          className={cn(
            "flex flex-col gap-3 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between",
            hasRegistration
              ? "mt-4"
              : "mt-9 border-t border-border pt-5"
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
                  className="transition-colors hover:text-primary"
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
              className="text-muted-foreground transition-colors hover:text-primary"
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

function KakaoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 3C6.48 3 2 6.45 2 10.7c0 2.75 1.88 5.16 4.7 6.52l-1.2 3.53a.45.45 0 0 0 .68.51l4.15-2.74c.54.08 1.1.12 1.67.12 5.52 0 10-3.45 10-7.94S17.52 3 12 3Z"
        fill="currentColor"
      />
    </svg>
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
