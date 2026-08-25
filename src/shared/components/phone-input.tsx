"use client"

import { useState } from "react"
import { formatKoreanPhone } from "@/shared/lib/validation"
import { cn } from "@/shared/lib/utils"

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "inputMode" | "value" | "onChange"> {
  defaultValue?: string
  onValueChange?: (value: string) => void
}

export function PhoneInput({
  defaultValue = "",
  className,
  readOnly,
  onValueChange,
  ...props
}: Props & { readOnly?: boolean }) {
  const [value, setValue] = useState(() => formatKoreanPhone(defaultValue))

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (readOnly) return
    const nextValue = formatKoreanPhone(e.target.value)
    setValue(nextValue)
    onValueChange?.(nextValue)
  }

  return (
    <input
      type="tel"
      inputMode="tel"
      value={value}
      onChange={handleChange}
      readOnly={readOnly}
      placeholder="010-0000-0000"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none transition-colors",
        "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50",
        "md:text-sm dark:bg-input/30",
        className
      )}
      {...props}
    />
  )
}
