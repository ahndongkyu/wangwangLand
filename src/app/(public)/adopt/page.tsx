import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Download, FileText } from "lucide-react"

import { getDog } from "@/features/dogs"
import { AdoptionForm } from "@/features/applications"
import { getCurrentProfile } from "@/features/members"
import { TERMS_VERSION } from "@/features/legal"
import { SITE } from "@/shared/constants/site"

export const metadata: Metadata = {
  title: "입양 신청",
  description: `${SITE.name}의 아이를 가족으로 맞이하려는 분들을 위한 안내와 신청 페이지입니다.`,
}

export default async function AdoptPage({
  searchParams,
}: {
  searchParams: Promise<{ dogId?: string }>
}) {
  const { dogId } = await searchParams
  const [dog, profile] = await Promise.all([
    dogId ? getDog(dogId) : Promise.resolve(null),
    getCurrentProfile(),
  ])

  if (!profile) redirect("/login")

  const termsAlreadyAgreed =
    !!profile?.terms_agreed_at && profile.terms_version === TERMS_VERSION

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 md:px-6 md:py-16">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-foreground md:text-4xl">
          입양 신청
        </h1>
        <p className="mt-3 text-muted-foreground">
          아이를 평생 가족으로 맞이해 주실 분의 소중한 마음에 감사드립니다.
          <br />
          신청 내용을 바탕으로 운영진이 상담을 도와드리며, 이후 방문 상담을 통해
          최종 입양이 결정됩니다.
        </p>
      </header>

      <section className="mb-10 rounded-lg border border-border bg-card p-6">
        <h2 className="text-base font-semibold text-foreground">입양 절차</h2>
        <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>1. 홈페이지에서 입양 신청서 작성</li>
          <li>2. 운영진 연락 후 전화/화상 상담</li>
          <li>3. 보호소 방문 상담 및 아이와의 만남</li>
          <li>4. 입양 결정 및 계약서 작성</li>
          <li>5. 입양 후 정기적인 소식 공유</li>
        </ol>
      </section>

      <AdoptionForm
        dogId={dog?.id}
        dogName={dog?.name}
        termsAlreadyAgreed={termsAlreadyAgreed}
      />

      {/* 자료실 — 입양·임시보호 신청서·유의사항 다운로드 */}
      <section className="mt-12">
        <header className="mb-4">
          <h2 className="flex items-center gap-1.5 text-lg font-bold text-foreground md:text-xl">
            <FileText className="size-5 text-primary" aria-hidden />
            자료실
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            인쇄용 신청서 양식과 유의사항 안내문입니다. 보호소 방문 상담 시 작성·지참하면 좋습니다.
          </p>
        </header>

        <div className="grid gap-3 sm:grid-cols-2">
          <DocCard
            file="/documents/adoption-application.pdf"
            title="입양 신청서"
            desc="입양 설문지 + 신청자 정보 + 필수 준수사항 (PDF · 2장)"
            tag="입양"
          />
          <DocCard
            file="/documents/adoption-notice.pdf"
            title="입양 신청 유의사항"
            desc="신청 전 필수 확인 사항 11개 (PDF · 1장)"
            tag="입양"
          />
          <DocCard
            file="/documents/foster-application.pdf"
            title="임시보호 신청서"
            desc="임시보호 설문지 + 신청자 정보 + 필수 준수사항 (PDF · 2장)"
            tag="임시보호"
          />
          <DocCard
            file="/documents/foster-notice.pdf"
            title="임시보호 신청 유의사항"
            desc="임시보호 전 필수 확인 사항 11개 (PDF · 1장)"
            tag="임시보호"
          />
        </div>
      </section>
    </div>
  )
}

function DocCard({
  file,
  title,
  desc,
  tag,
}: {
  file: string
  title: string
  desc: string
  tag: string
}) {
  return (
    <a
      href={file}
      download
      className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-secondary/30"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <FileText className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-foreground/70">
            {tag}
          </span>
          <span className="truncate text-sm font-semibold text-foreground">
            {title}
          </span>
        </span>
        <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">
          {desc}
        </span>
      </span>
      <Download
        className="size-4 shrink-0 self-center text-muted-foreground transition-colors group-hover:text-primary"
        aria-hidden
      />
    </a>
  )
}
