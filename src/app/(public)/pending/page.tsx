import { redirect } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import { getCurrentProfile } from "@/features/members"
import { buttonVariants } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"

export const metadata: Metadata = { title: "승인 대기 중" }

export default async function PendingPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect("/login")
  if (profile.status === "approved") redirect("/")
  if (profile.status === "rejected") redirect("/rejected")

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-20 text-center">
      <div className="w-full rounded-2xl border border-border bg-card p-8 shadow-sm">
        <p className="text-4xl">⏳</p>
        <h1 className="mt-4 text-2xl font-bold text-foreground">
          승인 대기 중이에요
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">{profile.nickname}</span>님,
          가입 신청이 접수됐습니다.
          <br />
          운영진 확인 후 승인되면 알림을 드립니다.
          <br />
          보통 1~2일 내에 처리됩니다.
        </p>
        <Link
          href="/"
          className={cn(buttonVariants({ variant: "outline" }), "mt-6 w-full")}
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  )
}
