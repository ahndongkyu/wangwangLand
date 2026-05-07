import { put } from "@vercel/blob"
import { NextResponse } from "next/server"

import { createClient } from "@/shared/lib/supabase/server"

export async function POST(request: Request) {
  // 로그인 확인
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const filename = searchParams.get("filename")
  if (!filename) {
    return NextResponse.json({ error: "filename이 필요합니다." }, { status: 400 })
  }

  const body = request.body
  if (!body) {
    return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 })
  }

  const blob = await put(filename, body, {
    access: "public",
    addRandomSuffix: false,
  })

  return NextResponse.json({ url: blob.url })
}
