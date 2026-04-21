"use client"

import Image from "next/image"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import { cn } from "@/shared/lib/utils"

interface Props {
  images: string[]
  thumbnailIndex?: number
  alt: string
  fallback?: React.ReactNode
}

export function PhotoGallery({
  images,
  thumbnailIndex = 0,
  alt,
  fallback,
}: Props) {
  const ordered = orderImages(images, thumbnailIndex)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const main = ordered[0] ?? null
  const others = ordered.slice(1)

  const openAt = useCallback((idx: number) => setLightboxIndex(idx), [])
  const close = useCallback(() => setLightboxIndex(null), [])

  if (!main) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-muted text-7xl">
        {fallback ?? "🐾"}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => openAt(0)}
        className="relative block aspect-square w-full overflow-hidden rounded-xl bg-muted transition-opacity hover:opacity-95"
        aria-label="사진 크게 보기"
      >
        <Image
          src={main}
          alt={alt}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
        />
      </button>

      {others.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {others.slice(0, 4).map((src, idx) => (
            <button
              key={src}
              type="button"
              onClick={() => openAt(idx + 1)}
              className="relative aspect-square overflow-hidden rounded-lg bg-muted transition-opacity hover:opacity-90"
              aria-label={`${idx + 2}번 사진 크게 보기`}
            >
              <Image
                src={src}
                alt={`${alt} ${idx + 2}`}
                fill
                sizes="(max-width: 768px) 25vw, 12vw"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {lightboxIndex != null && (
        <Lightbox
          images={ordered}
          alt={alt}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={close}
        />
      )}
    </div>
  )
}

function orderImages(images: string[], thumbIdx: number): string[] {
  if (images.length === 0) return []
  const idx = Math.min(Math.max(0, thumbIdx), images.length - 1)
  if (idx === 0) return images
  return [images[idx], ...images.slice(0, idx), ...images.slice(idx + 1)]
}

function Lightbox({
  images,
  alt,
  index,
  onIndexChange,
  onClose,
}: {
  images: string[]
  alt: string
  index: number
  onIndexChange: (i: number) => void
  onClose: () => void
}) {
  const total = images.length
  const goPrev = useCallback(
    () => onIndexChange((index - 1 + total) % total),
    [index, total, onIndexChange]
  )
  const goNext = useCallback(
    () => onIndexChange((index + 1) % total),
    [index, total, onIndexChange]
  )

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowLeft") goPrev()
      if (e.key === "ArrowRight") goNext()
    }
    window.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [goPrev, goNext, onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className="absolute right-4 top-4 z-10 flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
      >
        <X className="size-5" />
      </button>

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              goPrev()
            }}
            aria-label="이전 사진"
            className={cn(
              "absolute left-4 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 md:size-12"
            )}
          >
            <ChevronLeft className="size-6" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              goNext()
            }}
            aria-label="다음 사진"
            className="absolute right-4 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 md:size-12"
          >
            <ChevronRight className="size-6" />
          </button>
        </>
      )}

      <div
        className="relative mx-auto w-full max-w-5xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-square w-full overflow-hidden rounded-lg md:aspect-[4/3]">
          <Image
            src={images[index]}
            alt={`${alt} ${index + 1}`}
            fill
            sizes="100vw"
            className="object-contain"
            priority
          />
        </div>
        {total > 1 && (
          <p className="mt-3 text-center text-sm text-white/80">
            {index + 1} / {total}
          </p>
        )}
      </div>
    </div>
  )
}
