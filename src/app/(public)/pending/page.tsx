import { redirect } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import { getCurrentProfile } from "@/features/members"
import { buttonVariants } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"

export const metadata: Metadata = { title: "가입 마무리" }

export default async function PendingPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect("/login")
  if (profile.status === "approved") redirect("/")
  if (profile.status === "rejected") redirect("/rejected")

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-20 text-center">
      <div className="w-full rounded-2xl border border-border bg-card p-8 shadow-sm">
        <p className="text-4xl">🐾</p>
        <h1 className="mt-4 text-2xl font-bold text-foreground">
          거의 다 왔어요!
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">{profile.nickname ?? "회원"}</span>님,
          가입을 완료하려면 마지막 단계만 남았어요.
          <br />
          닉네임·약관 동의를 마치면 바로 활동할 수 있어요.
        </p>
        <Link
          href="/onboarding"
          className={cn(buttonVariants(), "mt-6 w-full")}
        >
          가입 마무리하기
        </Link>
        <Link
          href="/"
          className="mt-2 inline-block text-xs text-muted-foreground hover:text-foreground"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  )
}
