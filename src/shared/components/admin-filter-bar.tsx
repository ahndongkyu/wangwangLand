"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

export interface FilterOption {
  label: string
  value: string
}

export interface FilterConfig {
  name: string
  defaultLabel: string
  options: FilterOption[]
}

interface Props {
  filters: FilterConfig[]
}

export function AdminFilterBar({ filters }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function handleChange(name: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(name, value)
    } else {
      params.delete(name)
    }
    params.delete("page")
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <>
      {filters.map((filter) => {
        const current = searchParams.get(filter.name) ?? ""
        return (
          <select
            key={filter.name}
            value={current}
            onChange={(e) => handleChange(filter.name, e.target.value)}
            className="h-9 w-40 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">{filter.defaultLabel}</option>
            {filter.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )
      })}
    </>
  )
}
