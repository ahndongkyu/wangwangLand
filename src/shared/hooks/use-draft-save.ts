"use client"

import { useCallback, useEffect, useRef, useState } from "react"

const DEBOUNCE_MS = 1500

/**
 * LocalStorage 기반 임시저장 훅.
 *
 * @param key     저장 키 (형식: "draft:{페이지경로}" 등 고유값 사용 권장)
 * @param value   현재 값 (변경될 때마다 자동 저장)
 * @param enabled 비활성화하려면 false (기본 true)
 */
export function useDraftSave(
  key: string,
  value: string,
  enabled = true
) {
  const [hasDraft, setHasDraft] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialValue = useRef(value)
  const offeredDraft = useRef(false)
  const lastValue = useRef(value)
  useEffect(() => { lastValue.current = value }, [value])
  const clearedValue = useRef<string | null>(null)

  // 마운트 시 기존 draft 확인
  useEffect(() => {
    if (!enabled) return
    offeredDraft.current = false
    clearedValue.current = null
    let active = true
    let found = false
    let date: Date | null = null
    try {
      const raw = localStorage.getItem(key)
      if (raw) {
        const parsed = JSON.parse(raw) as { value: string; savedAt: string }
        if (parsed.value && parsed.value !== initialValue.current) {
          offeredDraft.current = true
          found = true
          date = new Date(parsed.savedAt)
        }
      }
    } catch {
      // 무시
    }
    queueMicrotask(() => { if (active) { setHasDraft(found); setSavedAt(date) } })
    return () => { active = false }
  }, [key, enabled])

  // value 변경 시 디바운스 저장
  useEffect(() => {
    if (!enabled) return
    // 복구할 글을 빈 초기 본문으로 덮어쓰지 않는다.
    if (offeredDraft.current || value === initialValue.current || value === clearedValue.current) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(
          key,
          JSON.stringify({ value, savedAt: new Date().toISOString() })
        )
        setSavedAt(new Date())
      } catch {
        // 무시 (storage full 등)
      }
    }, DEBOUNCE_MS)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [key, value, enabled])

  useEffect(() => {
    if (!enabled) return
    const flush = () => {
      if (offeredDraft.current || lastValue.current === initialValue.current || lastValue.current === clearedValue.current) return
      try { localStorage.setItem(key, JSON.stringify({ value: lastValue.current, savedAt: new Date().toISOString() })) } catch { /* 저장 공간 부족 */ }
    }
    window.addEventListener("pagehide", flush)
    return () => window.removeEventListener("pagehide", flush)
  }, [key, enabled])

  /** 임시저장된 값 반환 */
  const getDraftValue = useCallback((): string | null => {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return null
      const parsed = JSON.parse(raw) as { value: string }
      return parsed.value ?? null
    } catch {
      return null
    }
  }, [key])

  /** 임시저장 삭제 (제출 성공 후 호출) */
  const clearDraft = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    offeredDraft.current = false
    clearedValue.current = lastValue.current
    try {
      localStorage.removeItem(key)
      setHasDraft(false)
      setSavedAt(null)
    } catch {
      // 무시
    }
  }, [key])

  const acceptDraft = useCallback(() => {
    offeredDraft.current = false
    setHasDraft(false)
  }, [])

  return { hasDraft, savedAt, getDraftValue, clearDraft, acceptDraft }
}
