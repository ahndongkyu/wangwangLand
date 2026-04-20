"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Search, X } from "lucide-react"
import { useEffect, useState, useTransition } from "react"

import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { cn } from "@/shared/lib/utils"

interface Props {
  placeholder?: string
  paramName?: string
  className?: string
}

export function SearchBox({
  placeholder = "이름으로 검색",
  paramName = "q",
  className,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const initial = searchParams.get(paramName) ?? ""
  const [value, setValue] = useState(initial)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    setValue(searchParams.get(paramName) ?? "")
  }, [searchParams, paramName])

  function navigate(next: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (next.trim()) params.set(paramName, next.trim())
    else params.delete(paramName)
    const qs = params.toString()
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname)
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    navigate(value)
  }

  function handleClear() {
    setValue("")
    navigate("")
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex items-center gap-2", className)}
    >
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          name={paramName}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="pl-9 pr-9"
          disabled={pending}
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="검색어 지우기"
            className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "검색 중..." : "검색"}
      </Button>
    </form>
  )
}
