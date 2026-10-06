"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/shared/lib/auth"
import { createAdminClient } from "@/shared/lib/supabase/admin"
import { POPUP_KEY_PREFIX, popupValidation, validPopupId, type HomepagePopup } from "../lib/popups"

export async function saveHomepagePopup(input: HomepagePopup, expectedRevision: string | null) {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }
  const validation = popupValidation(input)
  if (validation) return { error: validation }
  if (expectedRevision !== null && !validPopupId(expectedRevision)) return { error: "저장 정보를 다시 불러와 주세요." }
  const popup: HomepagePopup = {
    id: input.id, revision: crypto.randomUUID(), title: input.title.trim(), body: input.body.trim(),
    image: input.image, imageAlt: input.imageAlt.trim(), linkLabel: input.linkLabel.trim(), linkUrl: input.linkUrl,
    startsAt: input.startsAt, endsAt: input.endsAt, enabled: input.enabled, placements: input.placements,
  }
  const db = createAdminClient(), key = `${POPUP_KEY_PREFIX}${popup.id}`
  const result = expectedRevision === null
    ? await db.from("app_settings").insert({ key, value: popup }).select("key")
    : await db.from("app_settings").update({ value: popup }).eq("key", key).eq("value->>revision", expectedRevision).select("key")
  if (result.error) return { error: "팝업을 저장하지 못했습니다. 다시 시도해 주세요." }
  if (result.data?.length !== 1) return { error: "다른 운영진이 변경하거나 삭제한 팝업입니다. 새로고침 후 다시 시도해 주세요." }
  revalidatePath("/admin/settings")
  return { popup }
}

export async function deleteHomepagePopup(id: string, revision: string) {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }
  if (!validPopupId(id) || !validPopupId(revision)) return { error: "삭제할 팝업을 확인해 주세요." }
  const { data, error } = await createAdminClient().from("app_settings").delete().eq("key", `${POPUP_KEY_PREFIX}${id}`).eq("value->>revision", revision).select("key")
  if (error || data?.length !== 1) return { error: "삭제하지 못했습니다. 다른 변경사항이 있는지 새로고침 후 확인해 주세요." }
  revalidatePath("/admin/settings")
  return { ok: true }
}

