import "server-only"
import { cache } from "react"
import { createAdminClient } from "@/shared/lib/supabase/admin"
import { OPERATING_DEFAULTS, OPERATING_KEYS, validateOperatingInfo, type OperatingGroup, type OperatingSnapshot } from "../lib/operating-info"

export const getOperatingInfo = cache(async (): Promise<OperatingSnapshot> => {
  const result = {} as OperatingSnapshot
  try {
    const { data, error } = await createAdminClient().from("app_settings").select("key,value").in("key", Object.values(OPERATING_KEYS))
    if (error) throw error
    for (const group of Object.keys(OPERATING_KEYS) as OperatingGroup[]) {
      const row = data?.find(row => row.key === OPERATING_KEYS[group])
      const value = row ? validateOperatingInfo(group, row.value?.data) : OPERATING_DEFAULTS[group]
      const valid = value && (!row || typeof row.value?.revision === "string")
      Object.assign(result, { [group]: { data: valid ? value : null, revision: valid && row ? row.value.revision : null, error: valid ? null : "설정 정보를 확인할 수 없습니다. 운영진에게 문의해 주세요." } })
    }
  } catch {
    for (const group of Object.keys(OPERATING_KEYS)) Object.assign(result, { [group]: { data: null, revision: null, error: "설정 정보를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요." } })
  }
  return result
})
