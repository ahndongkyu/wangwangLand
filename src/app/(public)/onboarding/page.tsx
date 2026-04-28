import { redirect } from "next/navigation"
import type { Metadata } from "next"

import { createClient } from "@/shared/lib/supabase/server"
import { OnboardingForm } from "@/features/members"
import { TERMS_VERSION } from "@/app/(public)/terms/page"
import { PRIVACY_VERSION } from "@/app/(public)/privacy/page"

export const metadata: Metadata = { title: "회원가입 완료" }

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { name } = await searchParams
  const defaultNickname =
    name ?? (user.user_metadata?.full_name as string | undefined) ?? ""

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-12 md:py-20">
      <div className="w-full rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
        <div className="mb-6 text-center md:mb-8">
          <p className="text-3xl">👋</p>
          <h1 className="mt-3 text-2xl font-bold text-foreground">
            왕왕랜드에 오신 것을 환영합니다
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            닉네임 설정과 약관 동의 후 가입이 완료됩니다.
          </p>
        </div>

        <OnboardingForm
          defaultNickname={defaultNickname}
          termsVersion={TERMS_VERSION}
          privacyVersion={PRIVACY_VERSION}
        />
      </div>
    </div>
  )
}
