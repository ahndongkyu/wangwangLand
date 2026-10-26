import { SITE } from "@/shared/constants/site"

export const OPERATING_DEFAULTS = {
  delivery: { recipient: SITE.donation.parcelRecipient, address: SITE.donation.parcelAddressShort, detail: "유기견보호소 왕왕랜드", phone: "", note: SITE.donation.parcelAddressNote },
  contact: { volunteerPhone: "010-3540-3156", adoptionPhone: "010-5473-2827", kakaoChannel: SITE.sns.kakaoChannel, naverCafe: SITE.sns.naverCafe, instagram: SITE.sns.instagram },
  account: { bankName: SITE.donation.bankName, accountNumber: SITE.donation.accountNumber, accountHolder: SITE.donation.accountHolder },
}
export type OperatingInfo = typeof OPERATING_DEFAULTS
export type OperatingGroup = keyof OperatingInfo
export type OperatingSnapshot = { [K in OperatingGroup]: { data: OperatingInfo[K] | null; revision: string | null; error: string | null } }
export const OPERATING_KEYS = { delivery: "site_delivery_settings", contact: "site_contact_settings", account: "site_account_settings" } as const

export function validateOperatingInfo<K extends OperatingGroup>(group: K, raw: unknown): OperatingInfo[K] | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null
  const input = raw as Record<string, unknown>
  const result: Record<string, string> = {}
  for (const key of Object.keys(OPERATING_DEFAULTS[group])) {
    if (typeof input[key] !== "string") return null
    const value = input[key].trim()
    const limit = key === "note" ? 500 : ["kakaoChannel", "naverCafe", "instagram"].includes(key) ? 2048 : 200
    if (value.length > limit || /[\u0000-\u0008\u000b-\u001f\u007f]/.test(value) || (key !== "note" && /[\r\n]/.test(value))) return null
    result[key] = value
  }
  const required = group === "delivery" ? ["recipient", "address"] : group === "contact" ? ["volunteerPhone", "adoptionPhone", "kakaoChannel"] : ["bankName", "accountNumber", "accountHolder"]
  if (required.some(key => !result[key])) return null
  for (const key of ["phone", "volunteerPhone", "adoptionPhone"]) {
    if (result[key] && (!/^[\d -]+$/.test(result[key]) || !/^0\d{8,10}$/.test(result[key].replace(/\D/g, "")))) return null
  }
  for (const key of ["kakaoChannel", "naverCafe", "instagram"]) {
    if (!result[key]) continue
    try {
      const url = new URL(result[key])
      const hosts = key === "kakaoChannel" ? ["pf.kakao.com"] : key === "naverCafe" ? ["cafe.naver.com"] : ["instagram.com", "www.instagram.com"]
      if (!["https:", "http:"].includes(url.protocol) || !hosts.includes(url.hostname) || url.username || url.password || url.port) return null
    } catch { return null }
  }
  if (group === "account" && !/^[\d -]{5,40}$/.test(result.accountNumber)) return null
  return result as OperatingInfo[K]
}
