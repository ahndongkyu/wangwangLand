"use client"

import { ChevronUp } from "lucide-react"
import { useEffect, useState } from "react"

export function ScrollToTopButton() {
  const [showTop, setShowTop] = useState(false)

  useEffect(() => {
    function onScroll() {
      setShowTop(window.scrollY > 200)
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  if (!showTop) return null

  return (
    <button
      type="button"
      aria-label="맨 위로"
      title="맨 위로"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-24 right-4 z-30 flex size-11 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-[0_3px_12px_rgba(70,83,77,0.14)] transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary hover:shadow-[0_5px_16px_rgba(70,83,77,0.18)] md:bottom-6 md:right-6"
    >
      <ChevronUp className="size-5" aria-hidden />
    </button>
  )
}
