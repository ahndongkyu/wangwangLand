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
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: PixelCrop,
  circular = false
): Promise<File> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")!

  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  if (circular) {
    ctx.beginPath()
    ctx.arc(
      pixelCrop.width / 2,
      pixelCrop.height / 2,
      Math.min(pixelCrop.width, pixelCrop.height) / 2,
      0,
      Math.PI * 2
    )
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
    pixelCrop.width,
    pixelCrop.height
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("Canvas is empty"))
      resolve(new File([blob], "cropped.jpg", { type: "image/jpeg" }))
    }, "image/jpeg", 0.92)
  })
}
