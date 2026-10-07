"use client"

import { useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

export function AnimalQuerySelect({ label, name, value, options }: {
  label: string; name: string; value: string; options: { value: string; label: string }[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()
  return <label className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
    <span className="shrink-0">{label}</span>
    <select value={value} disabled={pending} className="min-h-11 min-w-0 rounded-lg border border-border bg-card px-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50" onChange={event => {
      const next = new URLSearchParams(params.toString())
      next.set(name, event.target.value)
      next.delete("page")
      startTransition(() => router.push(`${pathname}?${next}`, { scroll: false }))
    }}>
      {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </label>
}
