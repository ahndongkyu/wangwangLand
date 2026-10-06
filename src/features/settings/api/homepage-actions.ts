"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/shared/lib/auth"
import { createAdminClient } from "@/shared/lib/supabase/admin"
import { validPhoto, type SitePhotos } from "../lib/homepage"

function refreshAnimals(kind: "dogs" | "cats") {
  for (const path of ["/", `/${kind}`, `/admin/${kind}`, "/admin/settings", "/my", "/my/likes"]) revalidatePath(path)
  revalidatePath(`/${kind}/[id]`, "page")
}
export async function saveSitePhotos(photos: SitePhotos) {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }
  if (!photos || !validPhoto(photos.banner, "banner") || !validPhoto(photos.about, "about")) return { error: "사진과 설명, 표시 위치를 확인해 주세요." }
  const { error } = await createAdminClient().from("app_settings").upsert({ key: "site_photos", value: photos }, { onConflict: "key" })
  if (error) return { error: "사진 설정 저장에 실패했습니다. 다시 시도해 주세요." }
  for (const path of ["/", "/about", "/admin/settings"]) revalidatePath(path)
  return { ok: true }
}

export async function changeAnimalPhoto(kind: "dogs" | "cats", id: string, image: string) {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }
  if (!["dogs", "cats"].includes(kind)) return { error: "잘못된 요청입니다." }
  const db = createAdminClient()
  const { data, error } = await db.from(kind).select("images").eq("id", id).single()
  if (error || !data || !Array.isArray(data.images)) return { error: "아이 정보를 다시 불러와 주세요." }
  const index = data.images.indexOf(image)
  if (index < 0) return { error: "사진이 변경되었습니다. 새로고침 후 다시 선택해 주세요." }
  const expectedImages = `{${data.images.map((src: string) => JSON.stringify(src)).join(",")}}`
  const result = await db.from(kind).update({ thumbnail_index: index }).eq("id", id).eq("images", expectedImages).select("id")
  if (result.error || result.data?.length !== 1) return { error: "저장하지 못했습니다. 사진 정보를 새로고침해 주세요." }
  refreshAnimals(kind)
  return { ok: true }
}

export async function saveHomeAnimals(ids: string[], autoFill: boolean, photos: Record<string, string>) {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }
  if (!Array.isArray(ids) || ids.length > 4 || new Set(ids).size !== ids.length || ids.some(id => typeof id !== "string") || typeof autoFill !== "boolean" || !photos || Object.keys(photos).length > 100) return { error: "노출 아이와 사진 선택을 확인해 주세요." }
  const { error } = await createAdminClient().rpc("save_home_animals", { selected_ids: ids, auto_fill: autoFill, photo_choices: photos })
  if (error) return { error: error.code === "PGRST202" ? "홈페이지 관리용 SQL을 먼저 적용해 주세요." : "저장하지 못했습니다. 아이의 상태나 사진이 변경되었을 수 있습니다. 새로고침 후 다시 시도해 주세요." }
  refreshAnimals("dogs")
  return { ok: true }
}
