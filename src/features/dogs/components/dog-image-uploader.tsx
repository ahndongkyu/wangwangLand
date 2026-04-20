"use client"

import Image from "next/image"
import { useState, useTransition } from "react"
import { Loader2, Upload, X } from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { createClient } from "@/shared/lib/supabase/client"
import { cn } from "@/shared/lib/utils"

interface Props {
  initialImages?: string[]
  initialThumbnailIndex?: number
}

export function DogImageUploader({
  initialImages = [],
  initialThumbnailIndex = 0,
}: Props) {
  const [images, setImages] = useState<string[]>(initialImages)
  const [thumbIdx, setThumbIdx] = useState(initialThumbnailIndex)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setError(null)
    startTransition(async () => {
      const supabase = createClient()
      const uploaded: string[] = []

      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() ?? "jpg"
        const path = `dogs/${crypto.randomUUID()}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from("public-images")
          .upload(path, file, { cacheControl: "3600", upsert: false })

        if (uploadError) {
          setError(`업로드 실패: ${uploadError.message}`)
          continue
        }

        const { data } = supabase.storage
          .from("public-images")
          .getPublicUrl(path)
        uploaded.push(data.publicUrl)
      }

      setImages((prev) => [...prev, ...uploaded])
    })

    e.target.value = ""
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx))
    if (thumbIdx === idx) setThumbIdx(0)
    else if (thumbIdx > idx) setThumbIdx((i) => i - 1)
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name="images" value={images.join(",")} />
      <input type="hidden" name="thumbnail_index" value={thumbIdx} />

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
              onClick={() => setThumbIdx(idx)}
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
          <span className="text-xs">사진 추가</span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleUpload}
            disabled={pending}
          />
        </label>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        사진 클릭 시 대표 사진 지정. 최대 10MB, jpg/png/webp/gif.
      </p>
    </div>
  )
}
