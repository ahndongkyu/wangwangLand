import type { BrandIconName } from "@/shared/components/brand-icon"

export const HOME_FAVORITE_OPTIONS = [
  { key: "volunteer", label: "봉사 신청", href: "/volunteer", icon: "volunteer" },
  { key: "adopt", label: "입양 문의", href: "/adopt", icon: "adopted" },
  { key: "daily", label: "일상", href: "/daily?category=일상", icon: "camera" },
  { key: "free", label: "자유게시판", href: "/daily?category=자유게시판", icon: "chat" },
  { key: "dogs", label: "입양 대기 아이들", href: "/dogs", icon: "dog" },
  { key: "calendar", label: "일정", href: "/calendar", icon: "calendar" },
  { key: "donate", label: "후원하기", href: "/donate", icon: "heart" },
] as const satisfies ReadonlyArray<{
  key: string
  label: string
  href: string
  icon: BrandIconName
}>

export type HomeFavoriteKey = (typeof HOME_FAVORITE_OPTIONS)[number]["key"]

export const DEFAULT_HOME_FAVORITES: HomeFavoriteKey[] = [
  "volunteer",
  "adopt",
  "daily",
]

export function isHomeFavoriteKey(value: string): value is HomeFavoriteKey {
  return HOME_FAVORITE_OPTIONS.some((item) => item.key === value)
}
