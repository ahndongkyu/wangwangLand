import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Download, FileText } from "lucide-react"

import { getDog } from "@/features/dogs"
import { getCat } from "@/features/cats"
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
  searchParams: Promise<{ dogId?: string; catId?: string }>
}) {
  const { dogId, catId } = await searchParams
  const profile = await getCurrentProfile()
  if (!profile) redirect("/login")
  const selected = dogId && !catId ? await getDog(dogId) : catId && !dogId ? await getCat(catId) : null
  const available = selected && ["보호중", "임시보호중"].includes(selected.status)
  const initialAnimal = available ? {
    id: selected.id, name: selected.name, kind: dogId ? "dog" as const : "cat" as const,
    image: selected.images[selected.thumbnail_index] ?? selected.images[0] ?? null,
  } : null

  const termsAlreadyAgreed =
    !!profile?.terms_agreed_at && profile.terms_version === TERMS_VERSION

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6 md:py-12">
      <header className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          입양 신청
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          아이와 함께할 생활을 들려주세요. 확인 후 상담을 도와드립니다.
        </p>
      </header>

      <section className="mb-7" aria-label="입양 절차">
        <ol className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground sm:text-sm">
          <li className="font-semibold text-primary">신청서 작성</li>
          <li>→ 상담</li><li>→ 보호소 방문</li><li>→ 입양 결정</li><li>→ 소식 공유</li>
        </ol>
      </section>

      <AdoptionForm
        initialAnimal={initialAnimal}
        unavailableAnimal={Boolean((dogId || catId) && !initialAnimal)}
        profilePhone={profile.phone ?? ""}
        termsAlreadyAgreed={termsAlreadyAgreed}
      />

      {/* 자료실 — 입양·임시보호 신청서·유의사항 다운로드 */}
      <details className="mt-6">
        <summary className="min-h-11 cursor-pointer content-center text-sm font-medium">입양·임시보호 서류 안내</summary>
        <header className="mb-4">
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
      </details>
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
