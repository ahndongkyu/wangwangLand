"use client"

import { useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"

// 브라우저 영구 저장소를 사용하지 않고 현재 탭의 주소별 스크롤 위치만 메모리에 보관한다.
const positions = new Map<string, number>()
export function AdminListPosition() {
  const pathname = usePathname()
  const query = useSearchParams().toString()
  useEffect(() => {
    const params = new URLSearchParams(query)
    params.sort()
    const key = pathname + "?" + params
    const saved = positions.get(key)
    const frame = requestAnimationFrame(() => {
      if (saved !== undefined) window.scrollTo({ top: saved, behavior: "instant" })
    })
    const remember = (event: MouseEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest("a[href]")) return
      if (positions.size > 50) positions.delete(positions.keys().next().value!)
      positions.set(key, window.scrollY)
    }
    document.addEventListener("click", remember, true)
    return () => { cancelAnimationFrame(frame); document.removeEventListener("click", remember, true) }
  }, [pathname, query])
  return null
}
