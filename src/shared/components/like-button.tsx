"use client"

import { Heart } from "lucide-react"
import { useEffect, useState, useTransition } from "react"

import { useToast } from "@/shared/components/toast"
import { createClient } from "@/shared/lib/supabase/client"
import { cn } from "@/shared/lib/utils"

interface Props {
  kind: "dog" | "cat"
  id: string
  initialCount: number
  /** 버튼 크기: "sm" (카드용), "md" (상세용) */
  size?: "sm" | "md"
  className?: string
}

/**
 * 관심 하트 버튼 — localStorage 에 사용자별 토글 상태 저장.
 * 같은 기기·브라우저에서만 1인 1회 효과 (쿠키 초기화 시 리셋).
 * 서버는 RPC 로 count 만 조정.
 */
export function LikeButton({
  kind,
  id,
  initialCount,
  size = "md",
  className,
}: Props) {
  const [count, setCount] = useState(initialCount)
  const [liked, setLiked] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [pending, startTransition] = useTransition()
  const toast = useToast()

  const storageKey = `liked:${kind}:${id}`

  useEffect(() => {
    setMounted(true)
    try {
      setLiked(localStorage.getItem(storageKey) === "1")
    } catch {
      // 무시
    }
  }, [storageKey])

  function handleClick() {
    const nextLiked = !liked
    const delta = nextLiked ? 1 : -1

    // 옵티미스틱 업데이트
    setLiked(nextLiked)
    setCount((c) => Math.max(0, c + delta))
    try {
      if (nextLiked) localStorage.setItem(storageKey, "1")
      else localStorage.removeItem(storageKey)
    } catch {
      // 무시
    }

    startTransition(async () => {
      const supabase = createClient()
      const rpc = kind === "dog" ? "increment_dog_like" : "increment_cat_like"
      const paramKey = kind === "dog" ? "p_dog_id" : "p_cat_id"
      const { data, error } = await supabase.rpc(rpc, {
        [paramKey]: id,
        p_delta: delta,
      })
      if (error) {
        // rollback
        setLiked(!nextLiked)
        setCount((c) => Math.max(0, c - delta))
        try {
          if (nextLiked) localStorage.removeItem(storageKey)
          else localStorage.setItem(storageKey, "1")
        } catch {}
        toast.error("하트 반영에 실패했어요. 잠시 후 다시 시도해주세요.")
        return
      }
      if (typeof data === "number") setCount(data)
    })
  }

  const iconSize = size === "sm" ? "size-3.5" : "size-4"
  const padding = size === "sm" ? "h-7 px-2 text-xs" : "h-9 px-3 text-sm"

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending || !mounted}
      aria-pressed={liked}
      aria-label={liked ? "관심 해제" : "관심 하트 누르기"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-semibold transition-colors",
        padding,
        liked
          ? "border-rose-500/40 bg-rose-500/10 text-rose-600"
          : "border-border bg-card text-foreground hover:border-rose-400/40 hover:text-rose-600",
        className
      )}
    >
      <Heart
        className={cn(iconSize, "transition-colors", liked && "fill-current")}
        aria-hidden
      />
      <span>{count}</span>
    </button>
  )
}
