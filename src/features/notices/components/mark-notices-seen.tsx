"use client"

import { useEffect } from "react"

import { markNoticesSeen } from "../hooks/use-notice-seen"
import { markNoticesSeenInDB } from "../api/mutations"

interface Props {
  /** 로그인 유저이면 DB에도 기록 */
  isLoggedIn?: boolean
}

/**
 * /notice 진입 시 마지막 열람 시각 갱신.
 * - 항상: localStorage 갱신 (비로그인 fallback)
 * - 로그인 유저: DB의 notices_last_seen_at도 함께 갱신
 */
export function MarkNoticesSeen({ isLoggedIn }: Props) {
  useEffect(() => {
    markNoticesSeen()
    if (isLoggedIn) {
      markNoticesSeenInDB()
    }
  }, [isLoggedIn])
  return null
}
