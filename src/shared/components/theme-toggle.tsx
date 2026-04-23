"use client"

import { BrandIcon } from "@/shared/components/brand-icon"
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
      {/* 낮 → 자는 강아지(밤으로 전환) / 밤 → 행복한 강아지(낮으로 전환) */}
      <BrandIcon
        name={isDark ? "dog-happy" : "dog-sleep"}
        size={22}
        decorative
      />
    </button>
  )
}
