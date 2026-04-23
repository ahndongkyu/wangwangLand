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
        "inline-flex size-9 items-center justify-center rounded-full border transition-all duration-200 hover:scale-105",
        isDark
          ? "border-border bg-foreground text-background hover:bg-foreground/90"
          : "border-[#D5C9B5] bg-transparent text-foreground/70 hover:border-[#E89B5E] hover:bg-[#FCE9D9] hover:text-foreground",
        className
      )}
    >
      {isDark ? (
        <Moon className="size-4" />
      ) : (
        <Sun className="size-4" />
      )}
    </button>
  )
}
