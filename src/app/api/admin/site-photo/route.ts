import { put } from "@vercel/blob"
import { requireAdmin } from "@/shared/lib/auth"

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return Response.json({ error: auth.error }, { status: 403 })
  const max = 4 * 1024 * 1024
  if (Number(request.headers.get("content-length")) > max) return Response.json({ error: "사진은 4MB 이하로 올려 주세요." }, { status: 413 })
  try {
    const reader = request.body?.getReader()
    if (!reader) return Response.json({ error: "사진이 없습니다." }, { status: 400 })
    const chunks: Uint8Array[] = []; let size = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > max) { await reader.cancel(); return Response.json({ error: "사진은 4MB 이하로 올려 주세요." }, { status: 413 }) }
      chunks.push(value)
    }
    const bytes = Buffer.concat(chunks)
    const format = bytes.subarray(0, 3).equals(Buffer.from([255,216,255])) ? "jpeg" : bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? "png" : bytes.toString("ascii",0,4) === "RIFF" && bytes.toString("ascii",8,12) === "WEBP" ? "webp" : null
    if (!format) return Response.json({ error: "JPG, PNG, WebP 사진만 가능합니다." }, { status: 400 })
    const blob = await put(`site-photos/${crypto.randomUUID()}.${format}`, bytes, { access: "public", contentType: `image/${format}`, addRandomSuffix: false })
    return Response.json({ url: blob.url })
  } catch { return Response.json({ error: "사진 업로드에 실패했습니다. 다시 시도해 주세요." }, { status: 500 }) }
}
