export type SitePhoto = { src: string; alt: string; x: number; y: number }
export type SitePhotos = { banner: SitePhoto; about: SitePhoto }
export const DEFAULT_PHOTOS: SitePhotos = {
  banner: { src: "/images/banner.jpeg", alt: "왕왕랜드 아이들", x: 50, y: 50 },
  about: { src: "/images/about.jpg", alt: "왕왕랜드에서 지내는 강아지", x: 50, y: 50 },
}
export type ManagedAnimal = { id: string; name: string; status: string; images: string[]; thumbnail_index: number; is_pinned: boolean; pin_order: number | null; rescue_date: string | null; created_at: string }
export function eligibleAnimal(animal: ManagedAnimal) {
  return ["보호중", "임시보호중"].includes(animal.status) && animal.images.length > 0
}
export function validPhoto(photo: SitePhoto, key: keyof SitePhotos) {
  if (!photo || typeof photo.src !== "string" || typeof photo.alt !== "string" || !photo.alt.trim() || photo.alt.length > 160) return false
  if (![photo.x, photo.y].every(n => Number.isFinite(n) && n >= 0 && n <= 100)) return false
  if (photo.src === DEFAULT_PHOTOS[key].src) return true
  try { const u = new URL(photo.src); return u.protocol === "https:" && u.hostname.endsWith(".public.blob.vercel-storage.com") && u.pathname.startsWith("/site-photos/") } catch { return false }
}
