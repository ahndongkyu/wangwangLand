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
        <h1 className="mb-6 text-center text-xl font-bold text-foreground md:mb-8 md:text-2xl">
          가입 정보 입력
        </h1>

        <OnboardingForm
          defaultNickname={defaultNickname}
          termsVersion={TERMS_VERSION}
          privacyVersion={PRIVACY_VERSION}
        />
      </div>
    </div>
  )
}
