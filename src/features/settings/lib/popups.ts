export const POPUP_KEY_PREFIX = "homepage-popup:"
export type PopupPlacement = "home" | "volunteer"
export type HomepagePopup = {
  id: string
  revision: string
  title: string
  body: string
  image: string
  imageAlt: string
  linkLabel: string
  linkUrl: string
  startsAt: string
  endsAt: string
  enabled: boolean
  placements: PopupPlacement[]
}

export function validPopupId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

export function safePopupLink(value: string) {
  if (!value) return true
  if (/[\s\\\u0000-\u001f]/.test(value)) return false
  if (value.startsWith("/") && !value.startsWith("//")) return true
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password } catch { return false }
}

export function validPopupImage(value: string) {
  if (!value) return true
  try {
    const url = new URL(value)
    return url.protocol === "https:" && !url.username && !url.password && url.hostname.endsWith(".public.blob.vercel-storage.com") && url.pathname.startsWith("/site-photos/")
  } catch { return false }
}

export function popupValidation(value: unknown): string | null {
  if (!value || typeof value !== "object") return "팝업 정보를 확인해 주세요."
  const p = value as HomepagePopup
  if (!validPopupId(p.id) || !validPopupId(p.revision)) return "팝업 식별 정보가 잘못되었습니다. 새로고침해 주세요."
  for (const [key, max] of [["title", 90], ["body", 5000], ["image", 2048], ["imageAlt", 160], ["linkLabel", 24], ["linkUrl", 2048]] as const) {
    if (typeof p[key] !== "string" || p[key].length > max) return "입력 길이와 내용을 확인해 주세요."
  }
  if (!p.title.trim() || !p.body.trim()) return "제목과 안내 내용을 입력해 주세요."
  if (!validPopupImage(p.image) || (p.image && !p.imageAlt.trim())) return "등록한 이미지와 이미지 설명을 확인해 주세요."
  if (!safePopupLink(p.linkUrl) || (p.linkUrl && !p.linkLabel.trim())) return "연결 주소와 버튼 문구를 확인해 주세요."
  if (typeof p.enabled !== "boolean" || !Array.isArray(p.placements) || !p.placements.length || p.placements.length > 2 || new Set(p.placements).size !== p.placements.length || p.placements.some(v => !["home", "volunteer"].includes(v))) return "노출 위치를 선택해 주세요."
  const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
  if (typeof p.startsAt !== "string" || typeof p.endsAt !== "string" || !iso.test(p.startsAt) || !iso.test(p.endsAt) || !Number.isFinite(Date.parse(p.startsAt)) || !Number.isFinite(Date.parse(p.endsAt)) || new Date(p.startsAt).toISOString() !== p.startsAt || new Date(p.endsAt).toISOString() !== p.endsAt || Date.parse(p.endsAt) <= Date.parse(p.startsAt)) return "노출 종료 시간은 시작 시간 이후로 설정해 주세요."
  return null
}

export function popupStatus(popup: HomepagePopup, now = Date.now()) {
  if (!popup.enabled) return "비공개"
  if (now < Date.parse(popup.startsAt)) return "예약"
  if (now >= Date.parse(popup.endsAt)) return "종료"
  return "노출 중"
}

export function activePopups(popups: HomepagePopup[], placement: PopupPlacement, now = Date.now()) {
  return popups.filter(p => !popupValidation(p) && p.placements.includes(placement) && popupStatus(p, now) === "노출 중")
    .sort((a,b) => b.startsAt.localeCompare(a.startsAt) || a.id.localeCompare(b.id))
}

export function toKoreanInput(iso: string) {
  const time = Date.parse(iso)
  return Number.isFinite(time) ? new Date(time + 9 * 3600000).toISOString().slice(0,16) : ""
}
export function fromKoreanInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return ""
  const date = new Date(`${value}:00+09:00`)
  return Number.isFinite(date.getTime()) && toKoreanInput(date.toISOString()) === value ? date.toISOString() : ""
}
export function nextKoreanMidnight(now = Date.now()) {
  const day = 86400000, offset = 9 * 3600000
  return (Math.floor((now + offset) / day) + 1) * day - offset
}
export function popupStorageKey(id: string) { return `wangwangland:popup:${id}:hidden-until` }

