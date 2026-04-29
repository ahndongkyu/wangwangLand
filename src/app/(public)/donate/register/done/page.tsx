import Link from "next/link"
import { CheckCircle2 } from "lucide-react"

import { DonateConfetti } from "./confetti"
import { buttonVariants } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"

export const dynamic = "force-dynamic"

export default async function DonateRegisterDonePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  await searchParams // 단순 방문 표시 — 본문에서는 안 씀
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center px-4 py-20 text-center md:px-6">
      <DonateConfetti />
      <div className="mb-6 flex size-16 items-center justify-center rounded-full bg-primary/15">
        <CheckCircle2 className="size-9 text-primary" />
      </div>
      <h1 className="text-2xl font-bold text-foreground md:text-3xl">
        후원 등록 접수 완료
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        따뜻한 마음에 감사드립니다.
        <br />
        운영진이 입금/물품 수령을 확인한 뒤 정식 기록으로 전환해드리며,
        <br />
        추후 기부금영수증 발급이 가능해지면 가장 먼저 안내드리겠습니다.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/donate" className={cn(buttonVariants({ variant: "outline" }))}>
          후원 안내로
        </Link>
        <Link href="/my/donations" className={cn(buttonVariants())}>
          내 후원 내역 보기
        </Link>
      </div>
    </div>
  )
}
