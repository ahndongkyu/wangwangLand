import Link from "next/link"

import { FOOTER_NAV, SITE } from "@/shared/constants/site"

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-auto border-t border-border/60 bg-secondary/40">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <p className="text-xl font-bold text-foreground">{SITE.name}</p>
            <p className="mt-2 text-sm text-muted-foreground">{SITE.subtitle}</p>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              {SITE.description}
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">바로가기</p>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {FOOTER_NAV.map((item) => (
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

          <div>
            <p className="text-sm font-semibold text-foreground">연락처</p>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
              {SITE.contact.phone && <li>전화 {SITE.contact.phone}</li>}
              {SITE.contact.email && (
                <li>
                  이메일{" "}
                  <a
                    href={`mailto:${SITE.contact.email}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {SITE.contact.email}
                  </a>
                </li>
              )}
              {SITE.contact.address && <li>주소 {SITE.contact.address}</li>}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-border/60 pt-6 md:flex-row md:items-center">
          <div className="text-xs text-muted-foreground">
            <p>
              © {year} {SITE.name}. All rights reserved.
            </p>
            <p className="mt-1">
              본 사이트는 유기견 보호소 {SITE.name}의 공식 홈페이지입니다.
            </p>
          </div>

          <div className="flex items-center gap-2">
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
                className="flex size-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <InstagramIcon className="size-4" />
              </a>
            )}
          </div>
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
