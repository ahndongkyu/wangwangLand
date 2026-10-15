import { put, get, del } from "@vercel/blob"
import { requireAdmin } from "@/shared/lib/auth"
import { createAdminClient } from "@/shared/lib/supabase/admin"
import { recordOperationError } from "@/features/operation-logs/server"

const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" }
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "허용되지 않은 요청입니다." }, { status: 403, headers })
  const auth = await requireAdmin()
  if (!auth.ok) return Response.json({ error: auth.error }, { status: 403, headers })
  if (Number(request.headers.get("content-length")) > 3 * 1024 * 1024 + 16384) return Response.json({ error: "파일은 3MB 이하로 첨부해주세요." }, { status: 413, headers })
  const token = process.env.BLOB_PRIVATE_READ_WRITE_TOKEN
  if (!token) {
    await recordOperationError("upload", "privateStorageConfiguration", undefined, "application")
    return Response.json({ error: "비공개 첨부파일 저장소 설정이 필요합니다." }, { status: 503, headers })
  }
  let uploaded: string | undefined
  try {
    const data = await request.formData()
    const id = String(data.get("application_id") ?? "")
    const kind = String(data.get("kind") ?? "")
    const file = data.get("file")
    if (!["survey", "application"].includes(kind) || !(file instanceof File) || !file.size || file.size > 3*1024*1024) return Response.json({ error: "설문지 또는 신청서 파일을 3MB 이하로 첨부해주세요." }, { status: 400, headers })
    const db = createAdminClient()
    const { data: application } = await db.from("adoption_applications").select("id").eq("id", id).maybeSingle()
    if (!application) return Response.json({ error: "신청을 찾을 수 없습니다." }, { status: 404, headers })
    const bytes = new Uint8Array(await file.arrayBuffer())
    const start = Buffer.from(bytes.subarray(0,12))
    const type = start.subarray(0,5).toString()==="%PDF-" ? ["pdf","application/pdf"] : start[0]===0xff && start[1]===0xd8 && start[2]===0xff ? ["jpg","image/jpeg"] : start.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? ["png","image/png"] : start.subarray(0,4).toString()==="RIFF" && start.subarray(8,12).toString()==="WEBP" ? ["webp","image/webp"] : null
    if (!type) return Response.json({ error: "PDF, JPG, PNG, WebP 파일만 첨부할 수 있습니다." }, { status: 400, headers })
    const blob = await put(`adoption-documents/${id}/${crypto.randomUUID()}.${type[0]}`, Buffer.from(bytes), { access: "private", token, contentType: type[1], addRandomSuffix: false })
    uploaded = blob.pathname
    const { error } = await db.from("adoption_documents").insert({ application_id:id, kind, pathname:blob.pathname, filename:file.name.slice(0,200), content_type:type[1], size_bytes:file.size, uploaded_by:auth.userId })
    if (error) throw error
    return Response.json({ ok: true }, { headers })
  } catch(error) {
    if (uploaded) await del(uploaded,{token}).catch(()=>{})
    await recordOperationError("upload","adoptionDocumentUpload",error,"application")
    return Response.json({ error: "서류를 저장하지 못했습니다. 다시 시도해주세요." }, { status:500, headers })
  }
}
export async function GET(request: Request) {
  const auth=await requireAdmin()
  if(!auth.ok) return Response.json({error:auth.error},{status:403,headers})
  try {
    const id=new URL(request.url).searchParams.get("id")
    const { data: file, error }=await createAdminClient().from("adoption_documents").select("pathname,filename,content_type").eq("id",id).maybeSingle()
    if(error || !file) return Response.json({error:"서류를 찾을 수 없습니다."},{status:404,headers})
    const token=process.env.BLOB_PRIVATE_READ_WRITE_TOKEN
    if(!token) {
      await recordOperationError("upload", "privateStorageConfiguration", undefined, "application")
      return Response.json({error:"저장소 설정이 필요합니다."},{status:503,headers})
    }
    const blob=await get(file.pathname,{access:"private",token})
    if(!blob?.stream) return Response.json({error:"서류를 찾을 수 없습니다."},{status:404,headers})
    const filename = encodeURIComponent(file.filename).replace(/['()*]/g,c=>`%${c.charCodeAt(0).toString(16)}`)
    return new Response(blob.stream,{headers:{...headers,"Content-Type":file.content_type,"Content-Disposition":`attachment; filename*=UTF-8''${filename}`,"Content-Security-Policy":"sandbox"}})
  }catch(error){
    await recordOperationError("query","adoptionDocumentRead",error,"application")
    return Response.json({error:"서류를 불러오지 못했습니다."},{status:500,headers})
  }
}
