"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/shared/lib/supabase/client"

/** 다른 계정·게시판·수정 글의 본문이 섞이지 않도록 저장 키를 구분한다. */
export function usePostDraftKey(board: string, postId = "new") {
  const [userId, setUserId] = useState<string | null>(null)
  useEffect(() => {
    const client = createClient()
    let active = true
    let authChanged = false
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      authChanged = true
      if (active) setUserId(session?.user.id ?? null)
    })
    void client.auth.getUser().then(({ data, error }) => {
      if (active && !authChanged) setUserId(error ? null : data.user?.id ?? null)
    }).catch(() => { /* 인증 확인 실패 시 로컬 저장을 사용하지 않는다. */ })
    return () => { active = false; subscription.unsubscribe() }
  }, [])
  return userId ? `draft:post:${userId}:${board}:${postId}` : undefined
}

export function clearPostDraft(key?: string) {
  if (!key) return
  try { localStorage.removeItem(key) } catch { /* 저장 공간을 사용할 수 없는 환경 */ }
}
