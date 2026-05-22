"use client"

import { useState } from "react"
import { Camera, Loader2 } from "lucide-react"
import { toPng } from "html-to-image"

interface Props {
  yearMonth: string
}

export function MonthShareButton({ yearMonth }: Props) {
  const [capturing, setCapturing] = useState(false)
  const [y, m] = yearMonth.split("-").map(Number)

  async function handleShare() {
    if (capturing) return
    const node = document.getElementById("admin-month-grid-capture")
    if (!node) {
      console.error("month grid DOM not found")
      return
    }
    setCapturing(true)
    try {
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        backgroundColor:
          getComputedStyle(document.body).backgroundColor || "#ffffff",
        cacheBust: true,
      })
      const fileName = `왕왕랜드_${y}년${m}월_일정.png`

      const resp = await fetch(dataUrl)
      const blob = await resp.blob()
      const file = new File([blob], fileName, { type: "image/png" })

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: fileName })
          return
        } catch {
          /* 취소 → 다운로드 */
        }
      }
      const a = document.createElement("a")
      a.href = dataUrl
      a.download = fileName
      a.click()
    } catch (e) {
      console.error("month screenshot error", e)
    } finally {
      setCapturing(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={capturing}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
    >
      {capturing ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Camera className="size-4" />
      )}
      {capturing ? "생성 중..." : "월 전체 공유"}
    </button>
  )
}
