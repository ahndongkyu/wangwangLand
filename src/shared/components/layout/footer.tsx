import Link from "next/link"

import { HeaderLogo } from "@/shared/components/header-logo"
import { FOOTER_LEGAL, SITE } from "@/shared/constants/site"
import { cn } from "@/shared/lib/utils"

const socialLinks = [
  { href: SITE.sns.kakaoChannel, label: "카카오톡 문의", icon: KakaoIcon },
  { href: SITE.sns.naverCafe, label: "네이버 카페", icon: NaverIcon },
  { href: SITE.sns.instagram, label: "인스타그램", icon: InstagramIcon },
]

export function Footer({ mobile = false }: { mobile?: boolean }) {
  const reg = SITE.registration
  return (
    <footer className={cn(
      "mt-auto bg-muted/50 px-5 text-center text-foreground",
      mobile ? "pt-7 pb-[calc(7rem+env(safe-area-inset-bottom))]" : "py-9"
    )}>
      <div className="mx-auto flex max-w-2xl flex-col items-center">
        <Link href="/" aria-label="왕왕랜드 홈" className="mb-5 inline-flex min-h-11 items-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
          <HeaderLogo className={mobile ? "w-[132px]" : "w-[150px]"} />
        </Link>
        <address className="text-[13px] leading-6 not-italic">{SITE.contact.addressShort}</address>
        <div className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs leading-5 text-muted-foreground">
          {reg.representativeName && <span>대표자 {reg.representativeName}</span>}
          {reg.shelterNumber && <span>동물보호센터 등록번호 {reg.shelterNumber}</span>}
          {reg.taxId && <span>고유번호 {reg.taxId}</span>}
        </div>
        <div className="mt-4 mb-2 flex justify-center gap-3" aria-label="공식 채널">
          {socialLinks.filter((item) => item.href).map(({ href, label, icon: Icon }) => (
            <a key={label} href={href} target="_blank" rel="noopener noreferrer"
              aria-label={`${label} (새 창)`} title={label}
              className="flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none">
              <Icon className="size-5" aria-hidden />
            </a>
          ))}
        </div>
        <ul className="flex flex-wrap justify-center gap-x-4 text-xs text-muted-foreground">
          {FOOTER_LEGAL.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="inline-flex min-h-11 items-center rounded-sm hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">© {new Date().getFullYear()} {SITE.name}. All rights reserved.</p>
      </div>
    </footer>
  )
}

function NaverIcon({ className }: { className?: string }) {
  return <span aria-hidden className={cn("inline-flex items-center justify-center text-xl leading-none font-black", className)}>N</span>
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect width="20" height="20" x="2" y="2" rx="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

function KakaoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M12 3C6.48 3 2 6.45 2 10.7c0 2.75 1.88 5.16 4.7 6.52l-1.2 3.53a.45.45 0 0 0 .68.51l4.15-2.74c.54.08 1.1.12 1.67.12 5.52 0 10-3.45 10-7.94S17.52 3 12 3Z" fill="currentColor" />
    </svg>
  )
}
