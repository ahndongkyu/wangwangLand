import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { createClient } from "@/shared/lib/supabase/server"
import { OnboardingForm } from "@/features/members"

export const metadata: Metadata = { title: "닉네임 설정" }

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { name } = await searchParams
  const defaultNickname = name ?? (user.user_metadata?.full_name as string | undefined) ?? ""

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-20">
      <div className="w-full rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-8 text-center">
          <p className="text-3xl">👋</p>
          <h1 className="mt-3 text-2xl font-bold text-foreground">
            닉네임을 설정해주세요
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            왕왕랜드에서 사용할 이름이에요.
            <br />
            나중에 프로필에서 변경할 수 있습니다.
          </p>
        </div>

        <OnboardingForm defaultNickname={defaultNickname} />
      </div>
    </div>
  )
}
