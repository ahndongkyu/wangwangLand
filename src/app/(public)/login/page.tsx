import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { getCurrentProfile } from "@/features/members"
import { KakaoLoginButton } from "@/features/members"
import { SITE } from "@/shared/constants/site"

export const metadata: Metadata = { title: "로그인" }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const profile = await getCurrentProfile()
  if (profile?.status === "approved") redirect("/")
  if (profile?.status === "pending") redirect("/pending")

  const { error } = await searchParams

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-20">
      <div className="w-full rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            {SITE.name}
          </p>
          <h1 className="mt-2 text-2xl font-bold text-foreground">
            함께하기
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            로그인하면 댓글과 활동에 참여할 수 있어요.
          </p>
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            로그인에 실패했습니다. 다시 시도해주세요.
          </p>
        )}

        <KakaoLoginButton />

        <p className="mt-6 text-center text-xs text-muted-foreground">
          가입 후 운영진 승인을 거쳐 활동할 수 있습니다.
        </p>
      </div>
    </div>
  )
}
