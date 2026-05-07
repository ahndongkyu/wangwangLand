export interface PixelCrop {
  x: number
  y: number
  width: number
  height: number
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener("load", () => resolve(image))
    image.addEventListener("error", reject)
    image.setAttribute("crossOrigin", "anonymous")
    image.src = url
  })
}

/**
 * 캔버스로 실제 크롭된 이미지를 File 객체로 반환
 * @param imageSrc - 원본 이미지 dataURL
 * @param pixelCrop - 크롭 영역 (px 단위)
 * @param circular - true면 원형으로 자름
 */
const MAX_OUTPUT_PX = 600 // 프로필 사진 최대 출력 크기

export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: PixelCrop,
  circular = false
): Promise<File> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")!

  // 출력 크기를 MAX_OUTPUT_PX 이하로 제한 (파일 크기 절감)
  const scale = Math.min(1, MAX_OUTPUT_PX / Math.max(pixelCrop.width, pixelCrop.height))
  const outW = Math.round(pixelCrop.width * scale)
  const outH = Math.round(pixelCrop.height * scale)

  canvas.width = outW
  canvas.height = outH

  if (circular) {
    ctx.beginPath()
    ctx.arc(outW / 2, outH / 2, Math.min(outW, outH) / 2, 0, Math.PI * 2)
    ctx.clip()
  }

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outW,
    outH
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("Canvas is empty"))
      resolve(new File([blob], "avatar.jpg", { type: "image/jpeg" }))
    }, "image/jpeg", 0.85)
  })
}
