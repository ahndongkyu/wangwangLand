"use client"

import { useEffect } from "react"

import { createClient } from "@/shared/lib/supabase/client"

interface Props {
  kind: "dog" | "cat"
  id: string
}

/**
 * 상세 페이지 마운트 시 조회수 +1. 같은 세션(sessionStorage) 에서는
 * 한 번만 카운트되도록 중복 방지. UI 는 렌더하지 않음.
 */
export function ViewTracker({ kind, id }: Props) {
  useEffect(() => {
    const key = `viewed:${kind}:${id}`
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, "1")
    } catch {
      // 프라이빗 모드 등 — 그냥 한 번 더 호출
    }

    const supabase = createClient()
    const rpc = kind === "dog" ? "increment_dog_view" : "increment_cat_view"
    const paramKey = kind === "dog" ? "p_dog_id" : "p_cat_id"

    void supabase.rpc(rpc, { [paramKey]: id }).then(({ error }) => {
      if (error) console.warn(`[ViewTracker] ${rpc} failed:`, error.message)
    })
  }, [kind, id])

  return null
}
