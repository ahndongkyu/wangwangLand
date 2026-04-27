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
  const d = SITE.donation
  const phones = SITE.contact.phones.filter((p) => p.number)

  return (
    <footer className="bg-[#F5EFE4] px-5 py-6 dark:border-t dark:border-[#3A3229] dark:bg-[#2B2520]">

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
          <div className="text-sm font-semibold text-[#2C2C2A] dark:text-[#F5EDE0]">
            {SITE.name}
          </div>
          <div className="text-[10px] text-[#6B5D4F] dark:text-[#B8A78F]">
            {SITE.subtitle}
          </div>
        </div>
      </div>

      {/* 주소 박스 */}
      <div className="mb-3 rounded-[10px] border-[0.5px] border-[#E8DDCF] bg-[#FDFAF5] p-3.5 dark:border-[rgba(255,212,161,0.08)] dark:bg-black/25">
        <div className="flex items-start gap-2">
          <PinIcon />
          <div className="text-xs leading-relaxed">
            <div className="text-[#3D3A35] dark:text-[#F5EDE0]">
              {SITE.contact.addressShort}
            </div>
            <div className="text-[#6B5D4F] dark:text-[#B8A78F]">
              유기견보호소 {SITE.name}
            </div>
          </div>
        </div>
      </div>

      {/* 계좌 후원 */}
      <div className="mb-3 rounded-[10px] border-[0.5px] border-[#E8DDCF] bg-[#FDFAF5] p-3.5 dark:border-[rgba(255,212,161,0.08)] dark:bg-black/25">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[10px] font-semibold tracking-wide text-[#9B8F80] dark:text-[#B8A78F]">
            계좌 후원
          </span>
          <span className="text-[10px] text-[#9B8F80] dark:text-[#B8A78F]">
            예금주 · {d.accountHolder}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="shrink-0 rounded-md bg-[#FAF3E8] px-2 py-0.5 text-[10px] font-medium text-[#6B5D4F] dark:bg-[rgba(255,212,161,0.1)] dark:text-[#FFD4A1]">
            {d.bankName}
          </span>
          <span className="min-w-0 flex-1 truncate font-mono text-[13px] font-semibold tracking-wide text-[#2C2C2A] dark:text-[#F5EDE0]">
            {d.accountNumber}
          </span>
          <CopyButton value={d.accountNumber} label="계좌번호" />
        </div>
      </div>

      {/* 메인 링크 4개 */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        {MOBILE_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center justify-center rounded-lg border-[0.5px] border-[#E2D6C8] bg-[#F7F2EA] py-2.5 text-[11px] font-medium text-[#5F5048] dark:border-[rgba(255,212,161,0.12)] dark:bg-[rgba(255,212,161,0.06)] dark:text-[#F5EDE0]"
          >
            {link.label} →
          </Link>
        ))}
      </div>

      {/* 연락처 (번호 있을 때만) */}
      {phones.length > 0 && (
        <div className="mb-3 rounded-[10px] border-[0.5px] border-[#E8DDCF] bg-[#FDFAF5] p-3.5 dark:border-[rgba(255,212,161,0.08)] dark:bg-black/25">
          <p className="mb-1.5 text-[10px] font-semibold tracking-wide text-[#9B8F80] dark:text-[#B8A78F]">
            연락처
          </p>
          <ul className="flex flex-col gap-1.5">
            {phones.map((p) => (
              <li key={p.label} className="flex items-center gap-2 text-xs">
                <span className="w-14 shrink-0 text-[10px] text-[#9B8F80] dark:text-[#B8A78F]">
                  {p.label}
                </span>
                <a
                  href={`tel:${p.number}`}
                  className="text-[#2C2C2A] hover:text-[#C06B2A] dark:text-[#F5EDE0]"
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
      {(SITE.sns.naverCafe || SITE.sns.instagram || SITE.sns.youtube) && (
        <div className="mb-3 grid grid-cols-2 gap-2.5">
          {SITE.sns.naverCafe && (
            <a
              href={SITE.sns.naverCafe}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-lg border-[0.5px] border-[#E2D6C8] bg-[#F7F2EA] py-2.5 text-[11px] font-medium text-[#2C2C2A] dark:border-[rgba(255,212,161,0.15)] dark:bg-[rgba(255,212,161,0.08)] dark:text-[#F5EDE0]"
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
              className="flex items-center justify-center gap-1.5 rounded-lg border-[0.5px] border-[#E2D6C8] bg-[#F7F2EA] py-2.5 text-[11px] font-medium text-[#2C2C2A] dark:border-[rgba(255,212,161,0.15)] dark:bg-[rgba(255,212,161,0.08)] dark:text-[#F5EDE0]"
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
              className="flex items-center justify-center gap-1.5 rounded-lg border-[0.5px] border-[#E2D6C8] bg-[#F7F2EA] py-2.5 text-[11px] font-medium text-[#2C2C2A] dark:border-[rgba(255,212,161,0.15)] dark:bg-[rgba(255,212,161,0.08)] dark:text-[#F5EDE0]"
            >
              <YouTubeIcon />
              유튜브
            </a>
          )}
        </div>
      )}

      {/* 구분선 */}
      <div className="my-3.5 h-px bg-[#D5C9B5] dark:bg-[#3A3229]" />

      {/* 저작권 */}
      <div className="text-center">
        <p className="mb-1.5 text-[10px] text-[#6B5D4F] dark:text-[#B8A78F]">
          © {year} {SITE.name}. All rights reserved.
        </p>
        <div className="flex items-center justify-center gap-3 text-[10px] text-[#9B8F80]">
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
      className="mt-0.5 shrink-0 stroke-[#C06B2A] dark:stroke-[#FFD4A1]"
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
