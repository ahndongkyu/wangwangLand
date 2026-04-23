import Link from "next/link"
import type { Metadata } from "next"
import { buttonVariants } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"

export const metadata: Metadata = { title: "가입 거절" }

export default function RejectedPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-20 text-center">
      <div className="w-full rounded-2xl border border-border bg-card p-8 shadow-sm">
        <p className="text-4xl">😢</p>
        <h1 className="mt-4 text-2xl font-bold text-foreground">
          가입이 거절되었습니다
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          문의사항이 있으시면 운영진에게 연락해주세요.
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
