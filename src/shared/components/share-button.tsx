"use client"

import { Share2 } from "lucide-react"
import { useState, useTransition } from "react"

import { useToast } from "@/shared/components/toast"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"

interface Props {
  title: string
  text?: string
  /** 상대 경로면 origin 붙임. 절대 URL 이면 그대로. */
  path: string
  /** 버튼 라벨. 기본 "공유하기" */
  label?: string
  className?: string
  /** 버튼 스타일 */
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg"
}

/**
 * 모바일: navigator.share 네이티브 공유 시트 (카카오·인스타 DM·문자 등 선택 가능).
 * 데스크톱/미지원: URL 을 클립보드에 복사하고 토스트로 알림.
 */
export function ShareButton({
  title,
  text,
  path,
  label = "공유",
  className,
  variant = "outline",
  size = "sm",
}: Props) {
  const [pending, startTransition] = useTransition()
  const [shared, setShared] = useState(false)
  const toast = useToast()

  function handleClick() {
    // 현재 사용자가 보고 있는 도메인을 우선 사용 (vercel.app 같은 보조 도메인 회피)
    const baseOrigin =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || ""
    const url = path.startsWith("http") ? path : `${baseOrigin}${path}`

    startTransition(async () => {
      // 1) 네이티브 share API (모바일 대부분 지원)
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({ title, text, url })
          setShared(true)
          setTimeout(() => setShared(false), 1500)
          return
        } catch (err) {
          // 사용자 취소는 조용히 무시
          if ((err as Error)?.name === "AbortError") return
        }
      }
      // 2) fallback — 클립보드 복사
      try {
        await navigator.clipboard.writeText(url)
        toast.success("링크를 복사했어요. 원하는 곳에 붙여넣기 해주세요.")
        setShared(true)
        setTimeout(() => setShared(false), 1500)
      } catch {
        toast.error("공유에 실패했어요. 브라우저 주소창에서 직접 복사해주세요.")
      }
    })
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={pending}
      className={cn(className)}
    >
      <Share2 className="size-4" aria-hidden />
      {shared ? "공유됨" : label}
    </Button>
  )
}
