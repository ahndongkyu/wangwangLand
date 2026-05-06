"use client"

import { useEffect } from "react"

interface Props {
  isLoggedIn: boolean
  action: () => Promise<void>
}

/**
 * 페이지 진입 시 열람 시각 갱신.
 * - 로그인 유저: action(서버 액션)으로 DB 갱신
 * - 비로그인 유저: no-op (localStorage는 각 페이지에서 별도 처리)
 */
export function MarkPageSeen({ isLoggedIn, action }: Props) {
  useEffect(() => {
    if (isLoggedIn) {
      action()
    }
  }, [isLoggedIn]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}
