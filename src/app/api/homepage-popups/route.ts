import { getActivePopups } from "@/features/settings/api/popup-queries"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const placement = new URL(request.url).searchParams.get("placement")
  const headers = { "Cache-Control": "no-store" }
  if (placement !== "home" && placement !== "volunteer") return Response.json({ error: "잘못된 노출 위치입니다." }, { status: 400, headers })
  try { return Response.json({ popups: await getActivePopups(placement) }, { headers }) }
  catch { return Response.json({ error: "안내를 불러오지 못했습니다." }, { status: 503, headers }) }
}
