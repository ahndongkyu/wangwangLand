import type { Metadata } from "next"

import { CopyButton } from "@/shared/components/copy-button"
import { SITE } from "@/shared/constants/site"

export const metadata: Metadata = {
  title: "연락처 · 오시는 길",
  description: `${SITE.name}의 위치와 연락처 안내.`,
}

export default function ContactPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 md:py-12">
      <header className="mb-10">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          연락처 · 오시는 길
        </h1>
        <p className="mt-3 text-muted-foreground">
          {SITE.name}의 위치와 문의 방법을 안내드립니다.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <p className="mb-2 text-sm text-muted-foreground">보호소 주소</p>
        <div className="mb-5 flex flex-wrap items-center gap-3"><p className="min-w-0 flex-1 break-words text-base font-semibold">{SITE.contact.address}</p><CopyButton value={SITE.contact.addressShort} label="주소" /></div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-foreground">오시는 길</h2>
          <div className="flex flex-wrap gap-2 text-xs">
            <a
              href={`https://map.kakao.com/?q=${encodeURIComponent(SITE.contact.mapQuery)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center rounded-lg border border-border bg-card px-3 py-2 font-medium text-foreground/80 transition-colors hover:border-primary hover:text-primary"
            >
              카카오맵
            </a>
            <a
              href={`https://map.naver.com/p/search/${encodeURIComponent(SITE.contact.mapQuery)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center rounded-lg border border-border bg-card px-3 py-2 font-medium text-foreground/80 transition-colors hover:border-primary hover:text-primary"
            >
              네이버 지도
            </a>
            <a
              href={`https://www.google.com/maps/search/${encodeURIComponent(SITE.contact.mapQuery)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center rounded-lg border border-border bg-card px-3 py-2 font-medium text-foreground/80 transition-colors hover:border-primary hover:text-primary"
            >
              구글맵
            </a>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border border-border">
          <iframe
            src={`https://www.google.com/maps?q=${encodeURIComponent(SITE.contact.mapQuery)}&output=embed`}
            title="왕왕랜드 위치"
            className="aspect-video w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      </section>
      <section className="mt-6 space-y-4 rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">문의 방법</h2>
        {SITE.sns.kakaoChannel && <a href={SITE.sns.kakaoChannel} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm font-medium hover:bg-muted">카카오톡 상담</a>}
        {SITE.contact.phones
          .filter((p) => p.number)
          .map((p) => (
            <InfoRow
              key={p.label}
              label={p.label}
              value={
                <span className="flex flex-wrap items-center gap-2">
                  <a
                    href={`tel:${p.number}`}
                    className="text-primary hover:underline"
                  >
                    {p.number}
                  </a>
                  <CopyButton value={p.number} label={`${p.label} 전화번호`} />
                </span>
              }
            />
          ))}
        {SITE.contact.email && (
          <InfoRow
            label="이메일"
            value={
              <span className="flex flex-wrap items-center gap-2">
                <a
                  href={`mailto:${SITE.contact.email}`}
                  className="text-primary hover:underline"
                >
                  {SITE.contact.email}
                </a>
                <CopyButton value={SITE.contact.email} label="이메일" />
              </span>
            }
          />
        )}
        {SITE.contact.kakaoTalk && (
          <InfoRow
            label="카카오톡"
            value={
              <span className="flex flex-wrap items-center gap-2">
                <span>{SITE.contact.kakaoTalk}</span>
                <CopyButton value={SITE.contact.kakaoTalk} label="카카오톡 ID" />
              </span>
            }
          />
        )}
        {SITE.contact.phones.every((p) => !p.number) &&
          !SITE.contact.email &&
          !SITE.contact.address && (
            <p className="text-sm text-muted-foreground">
              연락처 정보는 준비 중입니다. 인스타그램 DM 또는 네이버 카페로 먼저
              연락 주세요.
            </p>
          )}
      </section>

    </div>
  )
}

function InfoRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-4">
      <span className="w-20 shrink-0 text-sm font-medium text-muted-foreground">
        {label}
      </span>
      <span className="min-w-0 break-words text-foreground">{value}</span>
    </div>
  )
}
