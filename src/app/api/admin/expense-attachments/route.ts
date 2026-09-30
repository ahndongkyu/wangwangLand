import { get } from "@vercel/blob"
import { NextResponse } from "next/server"

import { requireAdmin } from "@/shared/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 403 })
  }

  const path = new URL(request.url).searchParams.get("path")
  if (!path || !/^expense-reports\/[A-Za-z0-9._-]+$/.test(path)) {
    return NextResponse.json({ error: "첨부파일 경로가 올바르지 않습니다." }, { status: 400 })
  }

  const blob = await get(path, { access: "private" })
  if (!blob?.stream) {
    return NextResponse.json({ error: "첨부파일을 찾을 수 없습니다." }, { status: 404 })
  }

  const headers = new Headers()
  blob.headers.forEach((value, key) => headers.set(key, value))
  headers.set("Cache-Control", "private, no-store")
  headers.set("Content-Disposition", "inline")
  return new Response(blob.stream, { headers })
}
