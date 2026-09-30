import { get } from "@vercel/blob"
import { NextResponse } from "next/server"

import { requireAdmin } from "@/shared/lib/auth"
import { createClient } from "@/shared/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const path = new URL(request.url).searchParams.get("path")
  if (!path || !/^expense-reports\/[A-Za-z0-9._-]+$/.test(path)) {
    return NextResponse.json({ error: "첨부파일 경로가 올바르지 않습니다." }, { status: 400 })
  }

  const auth = await requireAdmin()
  if (!auth.ok) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })

    // 파일 경로를 알아도 공개된 게시글에 연결된 파일만 회원이 열람할 수 있다.
    const fileUrl = `/api/admin/expense-attachments?path=${encodeURIComponent(path)}`
    const visiblePosts = () => supabase.from("notices").select("id").eq("board_type", "expense").eq("home_visible", true).not("published_at", "is", null)
    const [attached, embedded] = await Promise.all([
      visiblePosts().contains("attachments", [{ path }]).limit(1),
      visiblePosts().contains("images", [fileUrl]).limit(1),
    ])
    if (!attached.data?.length && !embedded.data?.length) {
      return NextResponse.json({ error: "열람할 수 없는 첨부파일입니다." }, { status: 403 })
    }
  }

  const token = process.env.BLOB_PRIVATE_READ_WRITE_TOKEN
  if (!token) {
    return NextResponse.json({ error: "비공개 첨부파일 저장소가 설정되지 않았습니다." }, { status: 503 })
  }
  try {
    const blob = await get(path, { access: "private", token })
    if (!blob?.stream) {
      return NextResponse.json({ error: "첨부파일을 찾을 수 없습니다." }, { status: 404 })
    }

    const headers = new Headers()
    blob.headers.forEach((value, key) => headers.set(key, value))
    headers.set("Cache-Control", "private, no-store")
    headers.set("Content-Disposition", "inline")
    headers.set("X-Content-Type-Options", "nosniff")
    return new Response(blob.stream, { headers })
  } catch (error) {
    console.error("[expense attachment]", error)
    return NextResponse.json({ error: "첨부파일을 불러오지 못했습니다." }, { status: 500 })
  }
}
