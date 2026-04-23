"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/shared/components/theme-provider"
import { cn } from "@/shared/lib/utils"

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
      title={isDark ? "라이트 모드" : "다크 모드"}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-md text-foreground/70 transition-colors hover:bg-secondary hover:text-foreground",
        className
      )}
    >
      {isDark ? (
        <Sun className="size-5" />
      ) : (
        <Moon className="size-5" />
      )}
    </button>
  )
}
