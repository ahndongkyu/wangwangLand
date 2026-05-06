"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

/**
 * 스크롤 위치 복원 컴포넌트.
 * 목록 페이지에 배치하면 상세 → 뒤로가기 시 스크롤 위치가 복원됩니다.
 *
 * 동작 방식:
 * 1. 스크롤할 때마다 현재 위치를 sessionStorage에 저장 (100ms 디바운스)
 * 2. 컴포넌트가 마운트될 때 저장된 위치가 있으면 복원 후 삭제
 */
export function ScrollRestorer() {
  const pathname = usePathname()
  const key = `scroll:${pathname}`

  useEffect(() => {
    // 저장된 스크롤 위치 복원
    const saved = sessionStorage.getItem(key)
    if (saved) {
      const y = parseInt(saved, 10)
      if (!isNaN(y) && y > 0) {
        // 두 번의 rAF로 콘텐츠 렌더링 완료 후 스크롤
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            window.scrollTo({ top: y, behavior: "instant" })
          })
        })
      }
      sessionStorage.removeItem(key)
    }

    // 스크롤 위치 저장 (디바운스)
    let timer: ReturnType<typeof setTimeout>
    function onScroll() {
      clearTimeout(timer)
      timer = setTimeout(() => {
        sessionStorage.setItem(key, String(window.scrollY))
      }, 100)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      clearTimeout(timer)
      window.removeEventListener("scroll", onScroll)
    }
  }, [key])

  return null
}
