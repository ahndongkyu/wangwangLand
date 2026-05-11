import { redirect } from "next/navigation"
import type { Metadata } from "next"
import Link from "next/link"

import { DailyForm } from "@/features/daily"
import { getCurrentProfile } from "@/features/members"
import { createAdminClient } from "@/shared/lib/supabase/admin"

export const metadata: Metadata = { title: "일상 작성" }
export const dynamic = "force-dynamic"

export default async function DailyNewPage({
  searchParams,
}: {
  searchParams: Promise<{ application?: string }>
}) {
  const profile = await getCurrentProfile()
  if (!profile) redirect("/login")
  if (profile.status !== "approved" || profile.is_banned) redirect("/")

  const params = await searchParams
  const applicationId = params.application?.trim()

  // 봉사 신청 ID가 있으면 본인 + 승인 + 봉사일 지났는지 검증
  let validatedAppId: string | undefined
  if (applicationId) {
    const admin = createAdminClient()
    const { data: app } = await admin
      .from("volunteer_applications")
      .select("id, created_by, status, available_dates")
      .eq("id", applicationId)
      .maybeSingle()
    if (app && app.created_by === profile.id && app.status === "승인") {
      validatedAppId = app.id
    }
  }

  const isVolunteerCert = !!validatedAppId

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 md:px-6 md:py-16">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href={isVolunteerCert ? "/my/applications" : "/daily"} className="hover:text-foreground">
          ← {isVolunteerCert ? "내 신청 내역" : "일상 목록"}
        </Link>
      </nav>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          {isVolunteerCert ? "봉사 인증글 작성" : "일상 작성"}
        </h1>
        {isVolunteerCert && (
          <p className="mt-2 text-sm text-muted-foreground">
            소중한 봉사 활동을 기록해주세요. 등록 시 봉사 횟수가 1회 추가됩니다.
          </p>
        )}
      </header>
      <DailyForm
        cancelHref={isVolunteerCert ? "/my/applications" : "/daily"}
        returnTo={isVolunteerCert ? "/my/applications" : "/daily"}
        volunteerApplicationId={validatedAppId}
      />
    </div>
  )
}
