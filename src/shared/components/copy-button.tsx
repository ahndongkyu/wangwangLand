"use client"

import { Check, Copy } from "lucide-react"
import { useState } from "react"

import { cn } from "@/shared/lib/utils"

interface Props {
  /** 복사할 텍스트 */
  value: string
  /** 접근성용 설명. 예: "계좌번호" */
  label?: string
  /** 추가 클래스 */
  className?: string
  /** "복사됨" 상태 유지 시간 (ms). 기본 1500 */
  resetMs?: number
}

export function CopyButton({
  value,
  label,
  className,
  resetMs = 1500,
}: Props) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), resetMs)
    } catch {
      // fallback: 구형 브라우저
      const ta = document.createElement("textarea")
      ta.value = value
      ta.style.position = "fixed"
      ta.style.opacity = "0"
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand("copy")
        setCopied(true)
        setTimeout(() => setCopied(false), resetMs)
      } finally {
        document.body.removeChild(ta)
      }
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={label ? `${label} 복사` : "복사"}
      title={label ? `${label} 복사` : "복사"}
      aria-live="polite"
      className={cn(
        "inline-flex items-center justify-center rounded-md border border-border bg-background p-1.5 text-foreground shadow-sm transition-colors",
        "hover:bg-secondary",
        copied && "border-primary/60 bg-primary/10 text-primary",
        className
      )}
    >
      {copied ? (
        <Check className="size-4" aria-hidden />
      ) : (
        <Copy className="size-4" aria-hidden />
      )}
      <span className="sr-only">{copied ? "복사됨" : "복사"}</span>
    </button>
  )
}
