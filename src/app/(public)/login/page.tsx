import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { getCurrentProfile } from "@/features/members"
import { KakaoLoginButton } from "@/features/members"
import { SITE } from "@/shared/constants/site"
import { loginReturnPath } from "@/features/members/lib/login-return"

export const metadata: Metadata = { title: "로그인" }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>
}) {
  const { error, next } = await searchParams
  const returnTo = loginReturnPath(next)
  const profile = await getCurrentProfile()
  if (profile?.status === "approved") redirect(returnTo)
  if (profile?.status === "pending") redirect("/pending")


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

        {error === "banned" && (
          <p className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            이용이 제한된 계정입니다. 문의사항은 운영진에게 연락해주세요.
          </p>
        )}
        {error && error !== "banned" && (
          <p className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            로그인에 실패했습니다. 다시 시도해주세요.
          </p>
        )}

        <KakaoLoginButton returnTo={returnTo} />

        <p className="mt-6 text-center text-xs text-muted-foreground">
          카카오 로그인 후 닉네임·연락처와 필수 동의를 등록하시면 이용 가능합니다.
        </p>
      </div>
    </div>
  )
}
