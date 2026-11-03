"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Search, X } from "lucide-react"
import { useEffect, useRef, useState, useTransition } from "react"

import { Input } from "@/shared/components/ui/input"
import { cn } from "@/shared/lib/utils"

interface Props {
  placeholder?: string
  paramName?: string
  className?: string
}

export function SearchBox(props: Props) {
  return <SearchBoxInput {...props} />
}

function SearchBoxInput({
  placeholder = "이름으로 검색",
  paramName = "q",
  className,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const searchParamsString = searchParams.toString()
  const initial = searchParams.get(paramName) ?? ""
  const [value, setValue] = useState(initial)
  const [, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const currentLocation = useRef({ pathname, searchParams: searchParamsString })

  useEffect(() => {
    currentLocation.current = { pathname, searchParams: searchParamsString }
    if (document.activeElement !== inputRef.current) setValue(initial)
  }, [initial, pathname, searchParamsString])

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }, [])

  function navigate(next: string) {
    const { pathname: currentPathname, searchParams: currentSearchParams } = currentLocation.current
    const params = new URLSearchParams(currentSearchParams)
    if (next.trim()) params.set(paramName, next.trim())
    else params.delete(paramName)
    params.delete("page")
    const qs = params.toString()
    startTransition(() => {
      router.replace(qs ? `${currentPathname}?${qs}` : currentPathname, { scroll: false })
    })
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value
    setValue(next)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => navigate(next), 350)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      navigate(value)
    }
  }

  function handleClear() {
    setValue("")
    if (debounceRef.current) clearTimeout(debounceRef.current)
    navigate("")
  }

  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        type="search"
        name={paramName}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="pl-9 pr-9"
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
  )
}
