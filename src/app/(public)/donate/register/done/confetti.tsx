"use client"

import { useEffect } from "react"
import confetti from "canvas-confetti"

/**
 * 후원 등록 완료 시 1회 confetti 효과.
 * 페이지 진입 후 0.3s 지연하여 발사 (mount 부드럽게).
 */
export function DonateConfetti() {
  useEffect(() => {
    const t = setTimeout(() => {
      const palette = ["#D85A30", "#F0B079", "#7BBF8F", "#FAF3E8"]
      // 좌우 양쪽에서 동시에
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
    return () => clearTimeout(t)
  }, [])
  return null
}
