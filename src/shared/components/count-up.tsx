"use client"

import { useEffect, useRef, useState } from "react"

interface Props {
  /** 최종 값 */
  value: number
  /** 애니메이션 지속 시간(ms). 기본 1200 */
  duration?: number
  /** 시작 지연(ms). 기본 0 */
  delay?: number
  /** 천 단위 콤마 등 포맷터 */
  formatter?: (n: number) => string
}

/**
 * 뷰포트에 들어올 때 0 → value 로 카운트업 애니메이션.
 * IntersectionObserver 로 1회만 실행. SSR 시엔 즉시 최종값.
 */
export function CountUp({
  value,
  duration = 1200,
  delay = 0,
  formatter = (n) => n.toLocaleString(),
}: Props) {
  const [display, setDisplay] = useState(0)
  const [shown, setShown] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || shown) return

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true)
            io.disconnect()
            break
          }
        }
      },
      { threshold: 0.3 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [shown])

  useEffect(() => {
    if (!shown) return
    const start = performance.now() + delay
    let raf = 0
    const step = (now: number) => {
      const elapsed = now - start
      if (elapsed < 0) {
        raf = requestAnimationFrame(step)
        return
      }
      const t = Math.min(1, elapsed / duration)
      // easeOutQuad
      const eased = 1 - (1 - t) * (1 - t)
      setDisplay(Math.round(value * eased))
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [shown, value, duration, delay])

  return (
    <span ref={ref} aria-label={String(value)}>
      {formatter(display)}
    </span>
  )
}
