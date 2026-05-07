"use client"

import { useState } from "react"
import { formatKoreanPhone } from "@/shared/lib/validation"
import { cn } from "@/shared/lib/utils"

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "inputMode" | "value" | "onChange"> {
  defaultValue?: string
}

export function PhoneInput({ defaultValue = "", className, ...props }: Props) {
  const [value, setValue] = useState(() => formatKoreanPhone(defaultValue))

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue(formatKoreanPhone(e.target.value))
  }

  return (
    <input
      type="tel"
      inputMode="tel"
      value={value}
      onChange={handleChange}
      placeholder="010-0000-0000"
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
        "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}
