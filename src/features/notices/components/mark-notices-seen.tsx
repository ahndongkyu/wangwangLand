"use client"

import { useEffect } from "react"

import { markNoticesSeen } from "../hooks/use-notice-seen"

/**
 * /notice 진입 시 localStorage 의 마지막 열람 시각을 '지금'으로 갱신한다.
 * 별도 UI 없음 — side-effect 전용 컴포넌트.
 */
export function MarkNoticesSeen() {
  useEffect(() => {
    markNoticesSeen()
  }, [])
  return null
}
