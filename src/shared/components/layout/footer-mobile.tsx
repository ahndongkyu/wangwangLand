import Image from "next/image"
import Link from "next/link"

import { CopyButton } from "@/shared/components/copy-button"
import { FOOTER_LEGAL, SITE } from "@/shared/constants/site"

const MOBILE_LINKS = [
  { label: "아이들 만나기", href: "/dogs" },
  { label: "센터 소개", href: "/about" },
  { label: "공지사항", href: "/notice" },
  { label: "오시는 길", href: "/contact" },
] as const

export function MobileFooter() {
  const year = new Date().getFullYear()
  const phones = SITE.contact.phones.filter((p) => p.number)

  return (
    <footer className="border-t border-border bg-[linear-gradient(110deg,var(--secondary)_0%,var(--accent)_100%)] px-5 py-6">

      {/* 로고 + 브랜드 */}
      <div className="mb-4 flex items-center gap-2.5">
        <Image
          src={SITE.logo}
          alt={`${SITE.name} 로고`}
          width={32}
          height={32}
          className="size-8 rounded-full"
        />
        <div>
          <div className="text-sm font-semibold text-foreground">
            {SITE.name}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {SITE.subtitle}
          </div>
        </div>
      </div>

      {/* 주소 박스 */}
      <div className="mb-3 rounded-xl border border-border bg-card/75 p-3.5">
        <div className="flex items-start gap-2">
          <PinIcon />
          <div className="text-xs leading-relaxed">
            <div className="text-foreground/80">
              {SITE.contact.addressShort}
            </div>
            <div className="text-muted-foreground">
              유기견보호소 {SITE.name}
            </div>
          </div>
        </div>
      </div>

      {/* 메인 링크 4개 */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        {MOBILE_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center justify-center rounded-lg border border-border bg-card/70 py-2.5 text-[11px] font-medium text-foreground/80 transition-colors hover:border-primary/40 hover:bg-card"
          >
            {link.label} →
          </Link>
        ))}
      </div>

      {/* 연락처 (번호 있을 때만) */}
      {phones.length > 0 && (
        <div className="mb-3 rounded-xl border border-border bg-card/75 p-3.5">
          <p className="mb-1.5 text-[10px] font-semibold tracking-wide text-muted-foreground">
            연락처
          </p>
          <ul className="flex flex-col gap-1.5">
            {phones.map((p) => (
              <li key={p.label} className="flex items-center gap-2 text-xs">
                <span className="w-14 shrink-0 text-[10px] text-muted-foreground">
                  {p.label}
                </span>
                <a
                  href={`tel:${p.number}`}
                  className="text-foreground/80 hover:text-primary"
                >
                  {p.number}
                </a>
                <CopyButton value={p.number} label={`${p.label} 전화번호`} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* SNS */}
      {(SITE.sns.kakaoChannel || SITE.sns.naverCafe || SITE.sns.instagram || SITE.sns.youtube) && (
        <div className="mb-3 grid grid-cols-3 gap-2">
          {SITE.sns.kakaoChannel && (
            <a
              href={SITE.sns.kakaoChannel}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 rounded-lg border border-[#F0D900] bg-[#FEE500] py-2.5 text-[10px] font-medium text-[#3C1E1E] transition-colors hover:bg-[#FFEA32]"
            >
              <KakaoIcon />
              카카오톡
            </a>
          )}
          {SITE.sns.naverCafe && (
            <a
              href={SITE.sns.naverCafe}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 rounded-lg border border-border bg-card/70 py-2.5 text-[10px] font-medium text-foreground/80 transition-colors hover:border-primary/40 hover:bg-card"
            >
              <NaverIcon />
              네이버 카페
            </a>
          )}
          {SITE.sns.instagram && (
            <a
              href={SITE.sns.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 rounded-lg border border-border bg-card/70 py-2.5 text-[10px] font-medium text-foreground/80 transition-colors hover:border-primary/40 hover:bg-card"
            >
              <InstagramIcon />
              인스타그램
            </a>
          )}
          {SITE.sns.youtube && (
            <a
              href={SITE.sns.youtube}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 rounded-lg border border-border bg-card/70 py-2.5 text-[10px] font-medium text-foreground/80 transition-colors hover:border-primary/40 hover:bg-card"
            >
              <YouTubeIcon />
              유튜브
            </a>
          )}
        </div>
      )}

      {/* 구분선 */}
      <div className="my-3.5 h-px bg-border" />

      {/* 저작권 */}
      <div className="text-center">
        <p className="mb-1.5 text-[10px] text-muted-foreground">
          © {year} {SITE.name}. All rights reserved.
        </p>
        <div className="flex items-center justify-center gap-3 text-[10px] text-muted-foreground">
          {FOOTER_LEGAL.map((item, i) => (
            <span key={item.href} className="flex items-center gap-3">
              {i > 0 && <span aria-hidden>·</span>}
              <Link href={item.href} className="hover:underline">
                {item.label}
              </Link>
            </span>
          ))}
        </div>
      </div>
    </footer>
  )
}

/* ─────────────── Icons ─────────────── */

function PinIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-0.5 shrink-0 stroke-primary"
      aria-hidden
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function NaverIcon() {
  return (
    <span
      className="inline-flex h-[18px] w-[18px] items-center justify-center rounded bg-[#03C75A] text-[10px] font-black text-white"
      aria-hidden
    >
      N
    </span>
  )
}

function KakaoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3C6.48 3 2 6.45 2 10.7c0 2.75 1.88 5.16 4.7 6.52l-1.2 3.53a.45.45 0 0 0 .68.51l4.15-2.74c.54.08 1.1.12 1.67.12 5.52 0 10-3.45 10-7.94S17.52 3 12 3Z"
        fill="currentColor"
      />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <defs>
        <linearGradient id="footer-mobile-ig" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F58529" />
          <stop offset="50%" stopColor="#DD2A7B" />
          <stop offset="100%" stopColor="#8134AF" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#footer-mobile-ig)" />
      <circle cx="12" cy="12" r="4" fill="none" stroke="white" strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1" fill="white" />
    </svg>
  )
}

function YouTubeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#FF0000" aria-hidden>
      <path d="M23 7s-.3-2-1.2-2.8c-1.1-1.2-2.4-1.2-3-1.3C16.4 2.8 12 2.8 12 2.8s-4.4 0-6.8.1c-.6.1-1.9.1-3 1.3C1.3 5 1 7 1 7S.7 9.2.7 11.5v2.1c0 2.3.3 4.5.3 4.5s.3 2 1.2 2.8c1.1 1.2 2.6 1.1 3.3 1.2C7.5 22.2 12 22.2 12 22.2s4.4 0 6.8-.2c.6-.1 1.9-.1 3-1.2.9-.8 1.2-2.8 1.2-2.8s.3-2.2.3-4.5v-2.1C23.3 9.2 23 7 23 7zM9.7 15.5V8.4l8.1 3.6-8.1 3.5z" />
    </svg>
  )
}
