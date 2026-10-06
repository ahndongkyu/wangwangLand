import "server-only"
import { createAdminClient } from "@/shared/lib/supabase/admin"
import { requireAdmin } from "@/shared/lib/auth"
import { POPUP_KEY_PREFIX, popupValidation, activePopups, type HomepagePopup, type PopupPlacement } from "../lib/popups"

async function readPopups() {
  const popups: HomepagePopup[] = []
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await createAdminClient().from("app_settings").select("key,value").like("key", `${POPUP_KEY_PREFIX}%`).order("key").range(offset, offset + 99)
    if (error) throw new Error("팝업 설정을 불러오지 못했습니다. 다시 시도해 주세요.")
    for (const row of data ?? []) {
      const popup = row.value as HomepagePopup
      if (!popupValidation(popup) && row.key === `${POPUP_KEY_PREFIX}${popup.id}`) popups.push(popup)
    }
    if (!data || data.length < 100) break
  }
  return popups.sort((a,b) => b.startsAt.localeCompare(a.startsAt) || a.id.localeCompare(b.id))
}

export async function getAdminPopups() {
  const auth = await requireAdmin()
  if (!auth.ok) return { popups: [], error: auth.error }
  try { return { popups: await readPopups(), error: null } }
  catch { return { popups: [], error: "팝업 설정을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요." } }
}

export async function getActivePopups(placement: PopupPlacement) {
  return activePopups(await readPopups(), placement)
}

