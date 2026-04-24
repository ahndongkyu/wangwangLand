"use client"

import { useState, useCallback } from "react"
import Cropper from "react-easy-crop"
import type { Area } from "react-easy-crop"
import { getCroppedImg } from "@/shared/lib/crop-image"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"

interface Props {
  imageSrc: string
  aspect?: number      // 1 = 정사각형, 4/3 = 일반 사진, undefined = 자유
  circular?: boolean   // 원형 크롭
  onDone: (file: File, previewUrl: string) => void
  onCancel: () => void
}

export function ImageCropModal({
  imageSrc,
  aspect = 1,
  circular = false,
  onDone,
  onCancel,
}: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [loading, setLoading] = useState(false)

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels)
  }, [])

  async function handleConfirm() {
    if (!croppedAreaPixels) return
    setLoading(true)
    try {
      const file = await getCroppedImg(imageSrc, croppedAreaPixels, circular)
      const previewUrl = URL.createObjectURL(file)
      onDone(file, previewUrl)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl bg-card p-5 shadow-xl">
        <h2 className="text-center text-base font-semibold text-foreground">
          {circular ? "프로필 사진 자르기" : "사진 자르기"}
        </h2>

        {/* 크롭 영역 */}
        <div className="relative h-72 w-full overflow-hidden rounded-xl bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={circular ? "round" : "rect"}
            showGrid={!circular}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            classes={{
              containerClassName: "!rounded-xl",
              cropAreaClassName: cn(
                "!border-2 !border-primary",
                circular && "!rounded-full"
              ),
            }}
          />
        </div>

        {/* 줌 슬라이더 */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">축소</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer accent-primary"
          />
          <span className="text-xs text-muted-foreground">확대</span>
        </div>

        {/* 버튼 */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            disabled={loading}
          >
            취소
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? "처리 중..." : "자르기"}
          </Button>
        </div>
      </div>
    </div>
  )
}
