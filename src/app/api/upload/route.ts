import { put } from "@vercel/blob"
import { NextResponse } from "next/server"

import { createClient } from "@/shared/lib/supabase/server"
import { recordOperationError } from "@/features/operation-logs/server"

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const filename = searchParams.get("filename")
  const scope = searchParams.get("scope")
  if (!filename) {
    return NextResponse.json({ error: "filename이 필요합니다." }, { status: 400 })
  }

  if (scope === "expense") {
    return NextResponse.json({ error: "페이지를 새로고침한 뒤 첨부파일을 다시 올려 주세요." }, { status: 400 })
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

  try {
    const blob = await put(filename, request.body, {
      access: "public",
      addRandomSuffix: false,
    })
    return NextResponse.json({ url: blob.url })
  } catch (error) {
    await recordOperationError("upload", "publicUpload", error, "upload")
    return NextResponse.json({ error: "파일 업로드에 실패했습니다. 잠시 후 다시 시도해주세요." }, { status: 500 })
  }
}
