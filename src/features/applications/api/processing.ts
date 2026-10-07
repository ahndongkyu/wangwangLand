"use server"

import { updateVolunteerApplication } from "./mutations"
import { getAdminApplicationList } from "./admin-queries"
import { applicationReturnHref, parseApplicationFilters } from "../lib/admin-list"
import { volunteerDetailHref } from "../lib/detail-navigation"

export async function approveVolunteerAndContinue(id: string, formData: FormData, returnTo: string) {
  const result = await updateVolunteerApplication(id, formData)
  if (result.error) return result
  const returnHref = applicationReturnHref(returnTo, "volunteer")
  // 저장 이후의 접수 상태로 재조회하여 이미 처리한 신청으로 이동하지 않습니다.
  try {
    const filters = parseApplicationFilters({ ...Object.fromEntries(new URLSearchParams(returnHref.split("?")[1])), status: "접수", page: "1" })
    const next = await getAdminApplicationList(filters)
    const row = next.rows.find(row => row.id !== id && row.status === "접수")
    return { ...result, redirectTo: row ? volunteerDetailHref(row.id, returnHref) : returnHref }
  } catch {
    // 다음 조회 실패가 완료된 승인을 실패로 보이게 해서는 안 됩니다.
    return { ...result, redirectTo: returnHref }
  }
}
