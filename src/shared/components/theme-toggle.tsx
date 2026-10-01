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
      title={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-transparent bg-transparent text-foreground transition-colors duration-200 hover:border-border hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none",
        className
      )}
    >
      {isDark ? (
        <Sun className="size-5" strokeWidth={1.7} aria-hidden />
      ) : (
        <Moon className="size-5" strokeWidth={1.7} aria-hidden />
      )}
    </button>
  )
}
