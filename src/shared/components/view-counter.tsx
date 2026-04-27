"use client"

import { useEffect } from "react"

import { createClient } from "@/shared/lib/supabase/client"

type PostTable = "notices" | "daily_posts" | "adoption_stories"

interface Props {
  table: PostTable
  postId: string
  /** 작성자 id (현재 사용자가 작성자면 카운트 제외) */
  authorId?: string | null
  /** 현재 로그인 사용자 id */
  currentUserId?: string | null
}

const TTL_MS = 24 * 60 * 60 * 1000 // 24시간

/**
 * 게시글 상세에서 조회수를 1 증가시키는 클라이언트 컴포넌트.
 *
 * 정책:
 *  - 본인 글이면 카운트 안 함
 *  - localStorage 로 24시간 내 중복 방지
 *  - SECURITY DEFINER RPC 호출로 RLS 우회
 */
export function ViewCounter({ table, postId, authorId, currentUserId }: Props) {
  useEffect(() => {
    if (!postId) return
    if (authorId && currentUserId && authorId === currentUserId) return

    const key = `viewed:${table}:${postId}`
    try {
      const last = localStorage.getItem(key)
      if (last) {
        const ts = Number(last)
        if (Number.isFinite(ts) && Date.now() - ts < TTL_MS) return
      }
    } catch {
      // localStorage 접근 불가 (privacy mode 등) → 그냥 카운트
    }

    let cancelled = false
    void (async () => {
      const supabase = createClient()
      const { error } = await supabase.rpc("increment_post_view_count", {
        p_table: table,
        p_id: postId,
      })
      if (cancelled) return
      if (error) {
        console.error("[ViewCounter] rpc error:", error)
        return
      }
      try {
        localStorage.setItem(key, String(Date.now()))
      } catch {
        // ignore
      }
    })()

    return () => {
      cancelled = true
    }
  }, [table, postId, authorId, currentUserId])

  return null
}
