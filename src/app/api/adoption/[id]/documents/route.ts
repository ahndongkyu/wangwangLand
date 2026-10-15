import { readFile } from "node:fs/promises"
import path from "node:path"
import { getAccessibleAdoption } from "@/features/applications/api/adoption-access"
import { generateAdoptionPdf } from "@/features/applications/lib/adoption-pdf"
import { recordOperationError } from "@/features/operation-logs/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" }
  let applicationId: string | undefined
  try {
    const { id } = await context.params
    applicationId = id
    const result = await getAccessibleAdoption(id)
    if (!result) return Response.json({ error: "열람 권한이 없습니다." }, { status: 403, headers })
    const app = result.application
    if (app.status !== "승인" || !app.confirmed_visit_at) return Response.json({ error: "방문 일정 승인 후 다운로드할 수 있습니다." }, { status: 409, headers })
    const font = await readFile(path.join(process.cwd(), "public/fonts/NanumGothic-Regular.ttf"))
    const bold = await readFile(path.join(process.cwd(), "public/fonts/NanumGothic-Bold.ttf"))
    const bytes = await generateAdoptionPdf(app, font, bold)
    return new Response(new Uint8Array(bytes), { headers: { ...headers, "Content-Type": "application/pdf", "Content-Disposition": "attachment; filename=adoption-visit-documents.pdf" } })
  } catch (error) {
    await recordOperationError("query", "adoptionPdf", error, "application", { targetType: "adoption", targetId: applicationId, action: "download" })
    return Response.json({ error: "서류를 만들지 못했습니다. 잠시 후 다시 시도해주세요." }, { status: 500, headers })
  }
}
