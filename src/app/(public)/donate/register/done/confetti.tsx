"use client"

import { useEffect } from "react"

/**
 * 후원 등록 완료 시 1회 confetti 효과.
 * canvas-confetti 라이브러리를 dynamic import 로 로드해서 다른 페이지의
 * 초기 번들에 포함되지 않게 함.
 */
export function DonateConfetti() {
  useEffect(() => {
    let cancelled = false
    const t = setTimeout(async () => {
      const confetti = (await import("canvas-confetti")).default
      if (cancelled) return
      const palette = ["#D85A30", "#F0B079", "#7BBF8F", "#FAF3E8"]
      const fire = (originX: number) =>
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { x: originX, y: 0.7 },
          colors: palette,
          startVelocity: 35,
          gravity: 0.9,
          ticks: 200,
        })
      fire(0.25)
      fire(0.75)
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [])
  return null
}
