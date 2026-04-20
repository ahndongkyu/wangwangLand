import type { Metadata } from "next"

import { SITE } from "@/shared/constants/site"

export const metadata: Metadata = {
  title: "연락처 · 오시는 길",
  description: `${SITE.name}의 위치와 연락처 안내.`,
}

export default function ContactPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 md:px-6 md:py-16">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-foreground md:text-4xl">
          연락처 · 오시는 길
        </h1>
        <p className="mt-3 text-muted-foreground">
          {SITE.name}과 연락하실 수 있는 방법을 안내드립니다.
        </p>
      </header>

      <section className="space-y-4 rounded-lg border border-border bg-card p-6">
        {SITE.contact.phone && (
          <InfoRow label="전화" value={SITE.contact.phone} />
        )}
        {SITE.contact.email && (
          <InfoRow
            label="이메일"
            value={
              <a
                href={`mailto:${SITE.contact.email}`}
                className="text-primary hover:underline"
              >
                {SITE.contact.email}
              </a>
            }
          />
        )}
        {SITE.contact.address && (
          <InfoRow
            label="주소"
            value={
              <div>
                <p>{SITE.contact.address}</p>
                {SITE.contact.addressNote && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    ※ {SITE.contact.addressNote}
                  </p>
                )}
              </div>
            }
          />
        )}
        {SITE.contact.kakaoTalk && (
          <InfoRow label="카카오톡" value={SITE.contact.kakaoTalk} />
        )}
        {!SITE.contact.phone && !SITE.contact.address && (
          <p className="text-sm text-muted-foreground">
            연락처 정보는 준비 중입니다. 이메일로 먼저 연락 주세요.
          </p>
        )}
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">오시는 길</h2>
          <a
            href={`https://map.kakao.com/?q=${encodeURIComponent(SITE.contact.mapQuery)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            카카오맵에서 열기 →
          </a>
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
      <span className="text-foreground">{value}</span>
    </div>
  )
}
