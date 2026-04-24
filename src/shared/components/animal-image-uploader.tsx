"use client"

import Image from "next/image"
import { useRef, useState, useTransition } from "react"
import { Loader2, Upload, X } from "lucide-react"

import { createClient } from "@/shared/lib/supabase/client"
import { ImageCropModal } from "@/shared/components/image-crop-modal"
import { cn } from "@/shared/lib/utils"

const MAX_IMAGES = 5

interface Props {
  /** Supabase Storage 내 상위 폴더 (예: "dogs", "cats", "daily") */
  folder: string
  initialImages?: string[]
  initialThumbnailIndex?: number
  maxImages?: number
}

export function AnimalImageUploader({
  folder,
  initialImages = [],
  initialThumbnailIndex = 0,
  maxImages = MAX_IMAGES,
}: Props) {
  const [images, setImages] = useState<string[]>(initialImages)
  const [thumbIdx, setThumbIdx] = useState(initialThumbnailIndex)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const thumbInputRef = useRef<HTMLInputElement>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const pendingFileRef = useRef<File | null>(null)

  function setThumb(idx: number) {
    setThumbIdx(idx)
    if (thumbInputRef.current) thumbInputRef.current.value = String(idx)
  }

  const remaining = Math.max(0, maxImages - images.length)
  const isFull = remaining === 0

  async function uploadFile(file: File) {
    const supabase = createClient()
    const path = `${folder}/${crypto.randomUUID()}.jpg`
    const { error: uploadError } = await supabase.storage
      .from("public-images")
      .upload(path, file, { cacheControl: "3600", upsert: false })
    if (uploadError) {
      setError(`업로드 실패: ${uploadError.message}`)
      return
    }
    const { data } = supabase.storage.from("public-images").getPublicUrl(path)
    setImages((prev) => [...prev, data.publicUrl].slice(0, maxImages))
  }

  function handleCropDone(file: File) {
    setCropSrc(null)
    pendingFileRef.current = null
    startTransition(() => uploadFile(file))
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (images.length >= maxImages) {
      setError(`사진은 최대 ${maxImages}장까지 가능합니다.`)
      e.target.value = ""
      return
    }
    setError(null)
    pendingFileRef.current = file
    const reader = new FileReader()
    reader.onload = () => setCropSrc(reader.result as string)
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
          aspect={4 / 3}
          onDone={handleCropDone}
          onCancel={() => { setCropSrc(null); pendingFileRef.current = null }}
        />
      )}
      <input type="hidden" name="images" value={images.join(",")} />
      <input type="hidden" name="thumbnail_index" ref={thumbInputRef} defaultValue={thumbIdx} />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
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

      <div className="flex flex-wrap items-start gap-3">
        {images.map((src, idx) => (
          <div
            key={src}
            className={cn(
              "group relative h-24 w-24 overflow-hidden rounded-lg border-2 transition-colors",
              idx === thumbIdx
                ? "border-primary"
                : "border-border hover:border-primary/50"
            )}
          >
            <button
              type="button"
              onClick={() => setThumb(idx)}
              className="block h-full w-full"
              aria-label={`${idx + 1}번 이미지를 대표로 선택`}
            >
              <Image src={src} alt="" fill className="object-cover" />
            </button>
            <button
              type="button"
              onClick={() => removeImage(idx)}
              className="absolute right-1 top-1 rounded-full bg-destructive/90 p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
              aria-label={`${idx + 1}번 이미지 삭제`}
            >
              <X className="size-3" />
            </button>
            {idx === thumbIdx && (
              <span className="absolute bottom-0 left-0 right-0 bg-primary/80 py-0.5 text-center text-[10px] font-bold text-primary-foreground">
                대표
              </span>
            )}
          </div>
        ))}

        {!isFull && (
          <label
            className={cn(
              "flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary",
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
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
              disabled={pending}
            />
          </label>
        )}
      </div>

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
