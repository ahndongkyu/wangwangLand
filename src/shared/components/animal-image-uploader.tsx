"use client"

import Image from "next/image"
import { useRef, useState } from "react"
import { ImageIcon, Loader2, Upload, X } from "lucide-react"

import { ImageCropModal } from "@/shared/components/image-crop-modal"
import { cn } from "@/shared/lib/utils"

const MAX_IMAGES = 5

interface Props {
  /** Supabase Storage 내 상위 폴더 (예: "dogs", "cats", "daily") */
  folder: string
  initialImages?: string[]
  initialThumbnailIndex?: number
  maxImages?: number
  onBusyChange?: (busy: boolean) => void
  disabled?: boolean
}

export function AnimalImageUploader({
  folder,
  initialImages = [],
  initialThumbnailIndex = 0,
  maxImages = MAX_IMAGES,
  onBusyChange,
  disabled = false,
}: Props) {
  const [images, setImages] = useState<string[]>(initialImages)
  const [thumbIdx, setThumbIdx] = useState(initialImages[initialThumbnailIndex] ? initialThumbnailIndex : 0)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const busyRef = useRef(false)

  function setThumb(idx: number) {
    setThumbIdx(idx)
  }

  const remaining = Math.max(0, maxImages - images.length)
  const isFull = remaining === 0

  async function uploadFile(file: File) {
    setPending(true)
    try {
      const filename = `${folder}/${crypto.randomUUID()}.jpg`
      const res = await fetch(`/api/upload?filename=${encodeURIComponent(filename)}`, {
        method: "POST",
        body: file,
      })
      const result = await res.json().catch(() => null)
      if (!res.ok || typeof result?.url !== "string") throw new Error(result?.error || "사진을 업로드하지 못했습니다. 다시 시도해 주세요.")
      setImages((prev) => [...prev, result.url].slice(0, maxImages))
    } catch (err) {
      setError(err instanceof Error ? err.message : "사진을 업로드하지 못했습니다.")
    } finally {
      setPending(false)
      busyRef.current = false
      onBusyChange?.(false)
    }
  }

  function handleCropDone(file: File) {
    setCropSrc(null)
    void uploadFile(file)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""
    if (busyRef.current || disabled) return
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setError("JPG·PNG·WebP·GIF 사진을 10MB 이하로 선택해 주세요.")
      return
    }
    if (images.length >= maxImages) {
      setError(`사진은 최대 ${maxImages}장까지 가능합니다.`)
      e.target.value = ""
      return
    }
    setError(null)
    busyRef.current = true
    onBusyChange?.(true)
    const reader = new FileReader()
    reader.onload = () => setCropSrc(reader.result as string)
    reader.onerror = () => { setError("사진을 읽지 못했습니다. 다시 선택해 주세요."); busyRef.current = false; onBusyChange?.(false) }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx))
    if (thumbIdx === idx) setThumb(0)
    else if (thumbIdx > idx) setThumb(thumbIdx - 1)
  }

  return (
    <div className="space-y-3">
      {cropSrc && (
        <ImageCropModal
          imageSrc={cropSrc}
          onDone={handleCropDone}
          onCancel={() => { setCropSrc(null); busyRef.current = false; onBusyChange?.(false) }}
        />
      )}
      <input type="hidden" name="images" value={images.join(",")} />
      <input type="hidden" name="thumbnail_index" value={thumbIdx} />

      <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
        {images[thumbIdx] ? <Image src={images[thumbIdx]} alt="선택한 대표사진" fill sizes="(min-width:1280px) 340px, (min-width:768px) 600px, 100vw" className="object-contain" /> : <div className="text-center text-muted-foreground"><ImageIcon className="mx-auto mb-3 size-8" aria-hidden /><p className="text-sm">사진을 등록해 주세요.</p></div>}
        {images.length > 0 && <span className="absolute bottom-3 left-3 rounded-md bg-card px-2 py-1 text-xs font-semibold text-foreground shadow-sm">대표사진</span>}
      </div>

      <div className="flex items-start justify-between gap-3 text-xs leading-5 text-muted-foreground">
        <span>
          사진을 클릭하면 <strong className="text-foreground">대표 사진</strong>으로
          지정돼요. 대표 사진이 목록·상세의 메인 이미지로 노출됩니다.
        </span>
        <span
          className={cn(
            "font-semibold",
            isFull ? "text-destructive" : "text-foreground"
          )}
        >
          {images.length} / {maxImages}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {images.map((src, idx) => (
          <div
            key={src}
            className={cn(
              "group relative min-w-0 overflow-hidden rounded-lg border-2 transition-colors",
              idx === thumbIdx
                ? "border-primary"
                : "border-border hover:border-primary/50"
            )}
          >
            <button
              type="button"
              disabled={disabled || pending || !!cropSrc}
              onClick={() => setThumb(idx)}
              className="relative block aspect-square w-full focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-4 disabled:opacity-50"
              aria-label={`${idx + 1}번 이미지를 대표로 선택`}
              aria-pressed={idx === thumbIdx}
            >
              <Image src={src} alt="" fill sizes="120px" className="object-cover" />
            </button>
            <button
              type="button"
              disabled={disabled || pending || !!cropSrc}
              onClick={() => removeImage(idx)}
              className="flex min-h-11 w-full items-center justify-center gap-1 border-t border-border bg-card text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
              aria-label={`${idx + 1}번 이미지 삭제`}
            >
              <X className="size-3" aria-hidden /> 삭제
            </button>
            {idx === thumbIdx && (
              <span className="pointer-events-none absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                대표
              </span>
            )}
          </div>
        ))}

        {!isFull && (
          <button
            type="button"
            disabled={disabled || pending || !!cropSrc}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "flex min-h-28 min-w-0 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border px-1 text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50",
              pending && "opacity-50"
            )}
          >
            {pending ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Upload className="size-5" />
            )}
            <span className="text-xs">
              {pending ? "업로드 중" : `사진 추가 (${remaining})`}
            </span>
          </button>
        )}
      </div>
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleFileSelect} disabled={disabled || pending || !!cropSrc} />

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        최대 {maxImages}장 / 장당 10MB 이하 / jpg · png · webp · gif
      </p>
    </div>
  )
}
