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

  // 마운트 시 기존 draft 확인
  useEffect(() => {
    if (!enabled) return
    try {
      const raw = localStorage.getItem(key)
      if (raw) {
        const parsed = JSON.parse(raw) as { value: string; savedAt: string }
        if (parsed.value && parsed.value !== initialValue.current) {
          setHasDraft(true)
          setSavedAt(new Date(parsed.savedAt))
        }
      }
    } catch {
      // 무시
    }
  }, [key, enabled])

  // value 변경 시 디바운스 저장
  useEffect(() => {
    if (!enabled) return
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
    try {
      localStorage.removeItem(key)
      setHasDraft(false)
      setSavedAt(null)
    } catch {
      // 무시
    }
  }, [key])

  return { hasDraft, savedAt, getDraftValue, clearDraft }
}
