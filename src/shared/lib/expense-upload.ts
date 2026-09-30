import { put } from "@vercel/blob/client"

/** 운영진 인증 후 발급된 제한 토큰으로 비공개 저장소에 직접 업로드한다. */
export async function uploadExpenseFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "file"
  const pathname = `expense-reports/${Date.now()}-${crypto.randomUUID().replaceAll("-", "")}.${extension}`
  const response = await fetch("/api/admin/expense-upload", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ pathname }),
  })
  const result = await response.json().catch(() => null) as { token?: string; error?: string } | null
  if (!response.ok || !result?.token) {
    throw new Error(result?.error || `파일 업로드 인증에 실패했습니다. (HTTP ${response.status})`)
  }

  const blob = await put(pathname, file, {
    access: "private",
    token: result.token,
    contentType: file.type || "application/octet-stream",
    multipart: file.size > 4 * 1024 * 1024,
  })
  return { path: blob.pathname, url: `/api/admin/expense-attachments?path=${encodeURIComponent(blob.pathname)}` }
}
