"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { X, ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/shared/lib/utils"

interface Props {
  images: string[]
}

export function ImageLightbox({ images }: Props) {
  const [open, setOpen] = useState(false)
  const [idx, setIdx] = useState(0)

  const prev = () => setIdx((i) => (i - 1 + images.length) % images.length)
  const next = () => setIdx((i) => (i + 1) % images.length)

  // ESC 닫기, 좌우 화살표
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
      if (e.key === "ArrowLeft") prev()
      if (e.key === "ArrowRight") next()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, idx])

  // 열려 있을 때 스크롤 잠금
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  function open_(i: number) {
    setIdx(i)
    setOpen(true)
  }

  return (
    <>
      {/* 썸네일 그리드 */}
      <div className="mt-10 space-y-4">
        {images.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => open_(i)}
            className="group relative w-full overflow-hidden rounded-xl border border-border transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            style={{ aspectRatio: "16/9" }}
            aria-label={`이미지 ${i + 1} 크게 보기`}
          >
            <Image
              src={src}
              alt={`공지 이미지 ${i + 1}`}
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-contain"
            />
            {/* 확대 힌트 */}
            <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
              <span className="rounded-full bg-black/50 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
                클릭하여 크게 보기
              </span>
            </span>
          </button>
        ))}
      </div>

      {/* 라이트박스 오버레이 */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          {/* 닫기 */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            aria-label="닫기"
          >
            <X className="size-5" />
          </button>

          {/* 이전 */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); prev() }}
              className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
              aria-label="이전"
            >
              <ChevronLeft className="size-6" />
            </button>
          )}

          {/* 이미지 */}
          <div
            className="relative max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={images[idx]}
              alt={`공지 이미지 ${idx + 1}`}
              className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            />
            {images.length > 1 && (
              <p className="mt-2 text-center text-xs text-white/60">
                {idx + 1} / {images.length}
              </p>
            )}
          </div>

          {/* 다음 */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); next() }}
              className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
              aria-label="다음"
            >
              <ChevronRight className="size-6" />
            </button>
          )}
        </div>
      )}
    </>
  )
}
