"use client"

import { useState, useRef, useCallback } from "react"
import ReactCrop, {
  type Crop,
  type PixelCrop,
  centerCrop,
  makeAspectCrop,
} from "react-image-crop"
import "react-image-crop/dist/ReactCrop.css"
import { getCroppedImg } from "@/shared/lib/crop-image"
import { Button } from "@/shared/components/ui/button"

interface Props {
  imageSrc: string
  aspect?: number      // 1 = 정사각형, 4/3 = 일반 사진, undefined = 자유
  circular?: boolean   // 원형 크롭
  onDone: (file: File, previewUrl: string) => void
  onCancel: () => void
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
): Crop {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 80 }, aspect, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight
  )
}

export function ImageCropModal({
  imageSrc,
  aspect,
  circular = false,
  onDone,
  onCancel,
}: Props) {
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [loading, setLoading] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { naturalWidth: width, naturalHeight: height } = e.currentTarget
      const initialAspect = circular ? 1 : aspect
      if (initialAspect) {
        setCrop(centerAspectCrop(width, height, initialAspect))
      } else {
        // 자유 선택: 기본 80% 영역으로 시작
        setCrop({ unit: "%", x: 10, y: 10, width: 80, height: 80 })
      }
    },
    [aspect, circular]
  )

  async function handleConfirm() {
    if (!completedCrop || !imgRef.current) return
    setLoading(true)
    try {
      // react-image-crop completedCrop은 자연 이미지 기준이 아닌 표시 크기 기준이므로
      // 실제 픽셀 크기로 스케일링
      const img = imgRef.current
      const scaleX = img.naturalWidth / img.width
      const scaleY = img.naturalHeight / img.height
      const scaledCrop = {
        x: completedCrop.x * scaleX,
        y: completedCrop.y * scaleY,
        width: completedCrop.width * scaleX,
        height: completedCrop.height * scaleY,
      }
      const file = await getCroppedImg(imageSrc, scaledCrop, circular)
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
        <p className="text-center text-xs text-muted-foreground -mt-2">
          {circular
            ? "원형 영역을 드래그해서 위치를 조정하세요"
            : "모서리·가장자리를 드래그해서 원하는 크기로 자유롭게 조정하세요"}
        </p>

        {/* 크롭 영역 */}
        <div className="flex max-h-[420px] justify-center overflow-auto rounded-xl bg-black">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={circular ? 1 : aspect}
            circularCrop={circular}
            keepSelection
            minWidth={40}
            minHeight={40}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={imageSrc}
              alt="크롭 이미지"
              onLoad={onImageLoad}
              style={{ maxHeight: 420, objectFit: "contain" }}
            />
          </ReactCrop>
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
            disabled={loading || !completedCrop}
          >
            {loading ? "처리 중..." : "자르기"}
          </Button>
        </div>
      </div>
    </div>
  )
}
