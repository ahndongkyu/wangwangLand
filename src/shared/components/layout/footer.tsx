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
            <p className="mt-2 text-sm text-muted-foreground">{SITE.tagline}</p>
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

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground md:flex-row md:items-center">
          <p>
            © {year} {SITE.name}. All rights reserved.
          </p>
          <p>
            본 사이트는 유기견 보호소 {SITE.name}의 공식 홈페이지입니다.
          </p>
        </div>
      </div>
    </footer>
  )
}
