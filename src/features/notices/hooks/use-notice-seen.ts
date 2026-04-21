"use client"

import { useSyncExternalStore } from "react"

const STORAGE_KEY = "wangwang:lastNoticeSeenAt"
const EVENT = "wangwang:notice-seen-changed"
const EPOCH = "1970-01-01T00:00:00Z"

function getSnapshot(): string {
  if (typeof window === "undefined") return EPOCH
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? EPOCH
  } catch {
    return EPOCH
  }
}

function getServerSnapshot(): string {
  return EPOCH
}

function subscribe(callback: () => void) {
  const onChange = () => callback()
  window.addEventListener(EVENT, onChange)
  // 다른 탭에서 바뀐 경우도 반영
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) callback()
  })
  return () => {
    window.removeEventListener(EVENT, onChange)
    // storage 핸들러는 익명이라 정확한 제거 불가하지만 페이지 언마운트 시 같이 사라짐
  }
}

/**
 * 사용자가 마지막으로 공지 페이지를 방문한 시각(ISO).
 * 초기/기본값은 epoch(1970) — 이 경우 모든 공지가 "새 글" 로 판정됨.
 */
export function useLastNoticeSeenAt(): string {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/** 현재 시각을 lastSeenAt 으로 저장. 브라우저 어디서든 호출 가능. */
export function markNoticesSeen(): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, new Date().toISOString())
    window.dispatchEvent(new Event(EVENT))
  } catch {
    // localStorage 차단(프라이빗 모드 등) — 무시
  }
}
