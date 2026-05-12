import type { Metadata } from "next"
import Link from "next/link"

import { VolunteerForm } from "@/features/applications"
import { getCurrentProfile } from "@/features/members"
import { TERMS_VERSION } from "@/features/legal"
import { listStaffAvailability } from "@/features/staff-schedule"
import { SITE } from "@/shared/constants/site"

export const metadata: Metadata = {
  title: "봉사 신청",
  description: `${SITE.name}에서 아이들과 함께할 봉사자를 모집합니다.`,
}

export const dynamic = "force-dynamic"

export default async function VolunteerPage() {
  const profile = await getCurrentProfile()

  // 비로그인이면 가입 안내
  if (!profile) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-16 md:py-24 text-center">
        <div className="mb-3 text-4xl">🐾</div>
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">봉사 신청</h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          회원가입 후 이용 가능합니다.
          <br />
          왕왕랜드 가족이 되어 아이들과 함께해 주세요.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/login?next=/volunteer"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            회원가입 / 로그인
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center text-xs text-muted-foreground hover:text-foreground"
          >
            홈으로
          </Link>
        </div>
      </div>
    )
  }

  // 가입 진행 중인 회원은 안내
  if (profile.status === "pending") {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-16 md:py-24 text-center">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">봉사 신청</h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          가입을 마무리해야 봉사 신청이 가능해요.
          <br />
          닉네임·약관 동의를 완료해 주세요.
        </p>
        <Link
          href="/onboarding"
          className="mt-5 inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          가입 마무리하기
        </Link>
      </div>
    )
  }
  if (profile.status === "rejected" || profile.is_banned) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-16 md:py-24 text-center">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">봉사 신청</h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          현재 봉사 신청이 제한된 계정입니다.
        </p>
      </div>
    )
  }

  const termsAlreadyAgreed =
    !!profile?.terms_agreed_at && profile.terms_version === TERMS_VERSION

  // 향후 90일 운영진 출근 일정 사전 fetch (날짜별로 그룹화)
  const today = new Date()
  const startStr = today.toISOString().slice(0, 10)
  const ninetyDaysLater = new Date(today.getTime() + 90 * 86400_000)
  const endStr = ninetyDaysLater.toISOString().slice(0, 10)
  const staffItems = await listStaffAvailability(startStr, endStr)
  const staffByDate: Record<string, { user_nickname: string; start_time: string | null; end_time: string | null; note: string | null }[]> = {}
  for (const it of staffItems) {
    if (!staffByDate[it.date]) staffByDate[it.date] = []
    staffByDate[it.date].push({
      user_nickname: it.user?.nickname ?? "운영진",
      start_time: it.start_time,
      end_time: it.end_time,
      note: it.note,
    })
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 md:px-6 md:py-16">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-foreground md:text-4xl">
          봉사 신청
        </h1>
        <p className="mt-3 text-muted-foreground">
          {SITE.name}에서 아이들과 함께할 봉사자를 기다립니다.
          <br />
          작은 손길 하나하나가 아이들에겐 큰 위로가 됩니다.
        </p>
      </header>

      <section className="mb-10 grid gap-3 md:grid-cols-2">
        <ActivityCard
          title="산책"
          description="아이들과 함께 산책하며 바깥 공기를 마셔요."
        />
        <ActivityCard
          title="목욕·미용"
          description="아이들의 위생을 지키고 건강을 돕습니다."
        />
        <ActivityCard
          title="청소·정리"
          description="보호소 환경을 쾌적하게 유지합니다."
        />
        <ActivityCard
          title="홍보·촬영"
          description="아이들이 새 가족을 만날 수 있도록 사진과 영상을 만들어요."
        />
      </section>

      <VolunteerForm termsAlreadyAgreed={termsAlreadyAgreed} staffByDate={staffByDate} />
    </div>
  )
}

function ActivityCard({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
