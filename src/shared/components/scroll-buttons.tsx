"use client"

import { ChevronDown, ChevronUp } from "lucide-react"
import { useEffect, useState } from "react"

import { cn } from "@/shared/lib/utils"

export function ScrollButtons() {
  const [atTop, setAtTop] = useState(true)
  const [atBottom, setAtBottom] = useState(false)
  const [scrollable, setScrollable] = useState(false)

  useEffect(() => {
    function update() {
      const doc = document.documentElement
      const viewport = window.innerHeight
      const scrollHeight = doc.scrollHeight
      const hasScroll = scrollHeight > viewport + 200
      setScrollable(hasScroll)
      setAtTop(window.scrollY < 200)
      setAtBottom(window.scrollY + viewport >= scrollHeight - 200)
    }
    update()
    window.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update)
    return () => {
      window.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
    }
  }, [])

  if (!scrollable) return null

  return (
    <div className="pointer-events-none fixed bottom-6 right-4 z-30 flex flex-col gap-2 md:right-6">
      <button
        type="button"
        onClick={() =>
          window.scrollTo({ top: 0, behavior: "smooth" })
        }
        aria-label="맨 위로"
        className={cn(
          "pointer-events-auto flex size-11 items-center justify-center rounded-full border border-border bg-card/90 text-foreground shadow-md backdrop-blur transition-opacity hover:bg-card",
          atTop ? "pointer-events-none opacity-0" : "opacity-100"
        )}
      >
        <ChevronUp className="size-5" />
      </button>
      <button
        type="button"
        onClick={() =>
          window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: "smooth",
          })
        }
        aria-label="맨 아래로"
        className={cn(
          "pointer-events-auto flex size-11 items-center justify-center rounded-full border border-border bg-card/90 text-foreground shadow-md backdrop-blur transition-opacity hover:bg-card",
          atBottom ? "pointer-events-none opacity-0" : "opacity-100"
        )}
      >
        <ChevronDown className="size-5" />
      </button>
    </div>
  )
}
