"use client"

import { Languages } from "lucide-react"
import { useState } from "react"

import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "@/features/translation"
import { cn } from "@/shared/lib/utils"

function readLocale(): SupportedLocale {
  const value = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${LOCALE_COOKIE}=`))
    ?.split("=")[1]

  return SUPPORTED_LOCALES.includes(value as SupportedLocale)
    ? (value as SupportedLocale)
    : DEFAULT_LOCALE
}

export function LocaleSwitcher({ className }: { className?: string }) {
  const [locale, setLocale] = useState<SupportedLocale>(() =>
    typeof document === "undefined" ? DEFAULT_LOCALE : readLocale()
  )

  function changeLocale(nextLocale: SupportedLocale) {
    if (nextLocale === locale) return
    document.cookie = `${LOCALE_COOKIE}=${nextLocale}; path=/; max-age=31536000; samesite=lax`
    setLocale(nextLocale)
    window.location.reload()
  }

  return (
    <label className={cn("inline-flex items-center gap-1.5", className)}>
      <Languages className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="sr-only">언어 선택</span>
      <select
        value={locale}
        onChange={(event) => changeLocale(event.target.value as SupportedLocale)}
        className="h-8 cursor-pointer appearance-none rounded-md border border-border bg-background px-2 pr-6 text-xs font-medium text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
        aria-label="언어 선택"
      >
        {SUPPORTED_LOCALES.map((item) => (
          <option key={item} value={item}>{LOCALE_LABELS[item]}</option>
        ))}
      </select>
    </label>
  )
}
