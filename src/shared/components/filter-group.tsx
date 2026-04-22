import Link from "next/link"

import { cn } from "@/shared/lib/utils"

export interface FilterOption {
  label: string
  value: string
  active: boolean
  href: string
}

interface Props {
  label: string
  options: FilterOption[]
  className?: string
}

/** 라벨 + pill 버튼 묶음 필터. 옵션 클릭 시 href 로 이동. */
export function FilterGroup({ label, options, className }: Props) {
  return (
    <div
      className={cn("flex flex-wrap items-center gap-2", className)}
      role="group"
      aria-label={label}
    >
      <span className="w-10 text-xs font-semibold text-muted-foreground">
        {label}
      </span>
      {options.map((o) => (
        <Link
          key={o.value}
          href={o.href}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            o.active
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground/80 hover:bg-secondary"
          )}
          aria-current={o.active ? "true" : undefined}
        >
          {o.label}
        </Link>
      ))}
    </div>
  )
}
