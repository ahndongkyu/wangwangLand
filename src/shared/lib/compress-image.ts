/**
 * 브라우저에서 이미지를 압축한다.
 *
 * - 작은 JPG/WebP 는 그대로 통과 (재인코딩으로 인한 화질 저하 방지)
 * - PNG / 큰 파일은 maxWidth 까지 비례 축소 후 JPG 로 재인코딩
 * - createImageBitmap 의 imageOrientation: "from-image" 로 EXIF 회전 보정
 *
 * 외부 라이브러리 없이 표준 Canvas API 만 사용.
 */
export interface CompressOptions {
  /** 가로/세로 중 더 긴 쪽이 이 값 이하가 되도록 축소 (기본 1920px) */
  maxDimension?: number
  /** JPEG 품질 0~1 (기본 0.9) */
  quality?: number
  /** 이 크기 이하 + JPG/WebP 면 압축 스킵 (기본 2MB) */
  passthroughBytes?: number
}

const DEFAULTS: Required<CompressOptions> = {
  maxDimension: 1920,
  quality: 0.9,
  passthroughBytes: 2 * 1024 * 1024,
}

export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<File> {
  const opts = { ...DEFAULTS, ...options }

  // 이미지가 아니면 그대로 반환 (호출 측에서 type 체크는 별도)
  if (!file.type.startsWith("image/")) return file

  // 이미 작은 JPG/WebP 는 재인코딩 안 함 (반복 압축으로 화질 저하 방지)
  const isSmallEnough = file.size <= opts.passthroughBytes
  const isAlreadyCompressed =
    file.type === "image/jpeg" || file.type === "image/webp"
  if (isSmallEnough && isAlreadyCompressed) return file

  // GIF 는 애니메이션 보존을 위해 압축하지 않음 (정적 첫 프레임만 남게 됨)
  if (file.type === "image/gif") return file

  let bitmap: ImageBitmap
  try {
    // EXIF orientation 자동 보정 (iOS 세로 사진 회전 문제 방지)
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
  } catch {
    // 옵션 미지원 브라우저 fallback
    bitmap = await createImageBitmap(file)
  }

  const { width: srcW, height: srcH } = bitmap
  const longest = Math.max(srcW, srcH)
  const scale = longest > opts.maxDimension ? opts.maxDimension / longest : 1
  const dstW = Math.round(srcW * scale)
  const dstH = Math.round(srcH * scale)

  const canvas = document.createElement("canvas")
  canvas.width = dstW
  canvas.height = dstH
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    bitmap.close()
    return file
  }
  ctx.drawImage(bitmap, 0, 0, dstW, dstH)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", opts.quality)
  )
  if (!blob) return file

  // 압축 후가 오히려 큰 경우는 원본 사용 (이미 작은 JPG 인데 PNG 라서 들어온 경우 등)
  if (blob.size >= file.size && isAlreadyCompressed) return file

  // 파일명 보존 + 확장자 .jpg 로 변경
  const baseName = file.name.replace(/\.[^.]+$/, "") || "image"
  const newName = `${baseName}.jpg`

  return new File([blob], newName, { type: "image/jpeg", lastModified: Date.now() })
}
