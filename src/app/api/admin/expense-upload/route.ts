import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client"
import { NextResponse } from "next/server"

import { requireAdmin } from "@/shared/lib/auth"
import { recordOperationError } from "@/features/operation-logs/server"

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 403 })

    const body = await request.json().catch(() => null)
    const pathname = body?.pathname
    if (typeof pathname !== "string" || !/^expense-reports\/[A-Za-z0-9_-]+\.(pdf|xlsx|xls|csv|hwp|hwpx|doc|docx|png|jpg|jpeg|webp)$/i.test(pathname)) {
      return NextResponse.json({ error: "허용되지 않은 첨부파일 경로입니다." }, { status: 400 })
    }
    const storeToken = process.env.BLOB_PRIVATE_READ_WRITE_TOKEN
    if (!storeToken) {
      await recordOperationError("upload", "privateStorageConfiguration", undefined, "upload")
      return NextResponse.json({ error: "비공개 첨부파일 저장소가 설정되지 않았습니다. 운영진에게 문의해 주세요." }, { status: 503 })
    }
    const token = await generateClientTokenFromReadWriteToken({
      token: storeToken,
      pathname,
      maximumSizeInBytes: 20 * 1024 * 1024,
      validUntil: Date.now() + 10 * 60 * 1000,
      addRandomSuffix: false,
      allowOverwrite: false,
    })
    return NextResponse.json({ token }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    await recordOperationError("upload", "privateUploadToken", error, "upload")
    console.error("[expense upload]", error)
    return NextResponse.json({ error: "첨부파일 업로드 준비에 실패했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 })
  }
}
