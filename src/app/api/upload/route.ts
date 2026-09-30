import { put } from "@vercel/blob"
import { NextResponse } from "next/server"

import { requireAdmin } from "@/shared/lib/auth"
import { createClient } from "@/shared/lib/supabase/server"

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const filename = searchParams.get("filename")
  const scope = searchParams.get("scope")
  if (!filename) {
    return NextResponse.json({ error: "filename이 필요합니다." }, { status: 400 })
  }

  if (scope === "expense") {
    const auth = await requireAdmin()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: 403 })
    }
    if (!/^expense-reports\/[A-Za-z0-9._-]+$/.test(filename)) {
      return NextResponse.json({ error: "허용되지 않은 파일 경로입니다." }, { status: 400 })
    }

    const file = await request.arrayBuffer()
    if (!file.byteLength) {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 })
    }
    if (file.byteLength > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "첨부파일은 20MB 이하만 올릴 수 있습니다." }, { status: 400 })
    }

    const blob = await put(filename, file, {
      access: "private",
      addRandomSuffix: false,
      contentType: request.headers.get("content-type") || undefined,
    })

    return NextResponse.json({ path: blob.pathname })
  }

  // 일반 본문 이미지는 기존처럼 로그인 사용자만 공개 저장할 수 있다.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }

  if (!request.body) {
    return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 })
  }

  const blob = await put(filename, request.body, {
    access: "public",
    addRandomSuffix: false,
  })

  return NextResponse.json({ url: blob.url })
}
