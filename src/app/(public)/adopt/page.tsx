import type { Metadata } from "next"

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
    </div>
  )
}
