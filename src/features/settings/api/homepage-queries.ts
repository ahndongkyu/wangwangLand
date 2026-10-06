import { createAdminClient } from "@/shared/lib/supabase/admin"
import { cache } from "react"
import { DEFAULT_PHOTOS, validPhoto, type SitePhotos, type ManagedAnimal } from "../lib/homepage"

export const getHomepageSettings = cache(async () => {
  const { data, error } = await createAdminClient().from("app_settings").select("key,value").in("key", ["site_photos", "home_auto_fill"])
  const raw = data?.find(r => r.key === "site_photos")?.value as Partial<SitePhotos> | undefined
  const photos = { ...DEFAULT_PHOTOS }
  for (const key of ["banner", "about"] as const) if (raw?.[key] && validPhoto(raw[key], key)) photos[key] = raw[key]
  return { photos, autoFill: data?.find(r => r.key === "home_auto_fill")?.value !== false, error: error ? "홈페이지 설정을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요." : null }
})

export async function getManagedAnimals(): Promise<ManagedAnimal[]> {
  const db = createAdminClient()
  const animals: ManagedAnimal[] = []
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db.from("dogs").select("id,name,status,images,thumbnail_index,is_pinned,pin_order,rescue_date,created_at").order("id").range(offset, offset + 499)
    if (error) throw new Error("아이들 정보를 불러오지 못했습니다.")
    animals.push(...data as ManagedAnimal[])
    if (data.length < 500) break
  }
  return animals
}
