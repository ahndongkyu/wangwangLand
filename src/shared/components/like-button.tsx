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
  /**
   * 로그인 상태에서 서버가 내려주는 liked 여부.
   * boolean이면 DB 기반 토글(toggle_dog_like / toggle_cat_like) 사용.
   * undefined이면 기존 localStorage 방식 유지.
   */
  initialLiked?: boolean
  /** 버튼 크기: "sm" (카드용), "md" (상세용) */
  size?: "sm" | "md"
  className?: string
}

/**
 * 관심 하트 버튼.
 * - 로그인(initialLiked가 boolean): DB 기반 토글 RPC 사용. localStorage 미사용.
 * - 비로그인(initialLiked가 undefined): localStorage 방식 유지 (increment_dog_like RPC).
 */
export function LikeButton({
  kind,
  id,
  initialCount,
  initialLiked,
  size = "md",
  className,
}: Props) {
  const isLoggedIn = initialLiked !== undefined

  const [count, setCount] = useState(initialCount)
  const [liked, setLiked] = useState(isLoggedIn ? initialLiked : false)
  const [mounted, setMounted] = useState(false)
  const [pending, startTransition] = useTransition()
  const toast = useToast()

  const storageKey = `liked:${kind}:${id}`

  useEffect(() => {
    setMounted(true)
    // 비로그인 시에만 localStorage에서 초기 상태 읽기
    if (!isLoggedIn) {
      try {
        setLiked(localStorage.getItem(storageKey) === "1")
      } catch {
        // 무시
      }
    }
  }, [storageKey, isLoggedIn])

  function handleClick() {
    if (isLoggedIn) {
      // DB 기반 토글
      const optimisticLiked = !liked
      const optimisticCount = Math.max(0, count + (optimisticLiked ? 1 : -1))
      setLiked(optimisticLiked)
      setCount(optimisticCount)

      startTransition(async () => {
        const supabase = createClient()
        const rpc = kind === "dog" ? "toggle_dog_like" : "toggle_cat_like"
        const paramKey = kind === "dog" ? "p_dog_id" : "p_cat_id"
        const { data, error } = await supabase.rpc(rpc, { [paramKey]: id })
        if (error) {
          // rollback
          setLiked(!optimisticLiked)
          setCount(count)
          toast.error("하트 반영에 실패했어요. 잠시 후 다시 시도해주세요.")
          return
        }
        if (data && typeof data === "object") {
          const result = data as { liked: boolean; count: number }
          setLiked(result.liked)
          setCount(result.count)
        }
      })
    } else {
      // localStorage 기반 토글 (비로그인)
      const nextLiked = !liked
      const delta = nextLiked ? 1 : -1

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
