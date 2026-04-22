"use client"

import Link from "next/link"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { useEffect } from "react"

import { Button, buttonVariants } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"

interface Props {
  error: Error & { digest?: string }
  reset: () => void
  /** 홈 버튼 링크 타깃 (public 이면 "/", 어드민이면 "/admin") */
  homeHref: string
  homeLabel: string
}

export function ErrorShell({ error, reset, homeHref, homeLabel }: Props) {
  useEffect(() => {
    console.error("[ErrorShell]", error)
  }, [error])

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-center justify-center px-4 py-16 text-center md:px-6">
      <div className="mb-5 rounded-full bg-destructive/10 p-3 text-destructive">
        <AlertTriangle className="size-6" aria-hidden />
      </div>
      <h1 className="text-2xl font-bold text-foreground md:text-3xl">
        오류가 발생했어요
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        잠시 후 다시 시도해주시거나, 홈으로 돌아갔다가 재접속해주세요.
        <br />
        문제가 계속되면 운영진에 알려주시면 감사하겠습니다.
      </p>

      {error.digest && (
        <p className="mt-4 rounded-md bg-muted px-3 py-1 font-mono text-[10px] text-muted-foreground">
          코드: {error.digest}
        </p>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
        <Button onClick={reset} size="lg">
          <RefreshCw className="size-4" />
          다시 시도
        </Button>
        <Link
          href={homeHref}
          className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
        >
          {homeLabel}
        </Link>
      </div>
    </div>
  )
}
