import Image from "next/image"

import { cn } from "@/shared/lib/utils"

export type BrandIconCategory =
  | "main"
  | "ui"
  | "info"
  | "activity"
  | "status"
  | "contact"

export type BrandIconName =
  // main
  | "dog"
  | "heart"
  | "home-shelter"
  | "adopted"
  | "volunteer"
  | "partnership"
  | "paw"
  | "star"
  // ui
  | "nav-home"
  | "search"
  | "menu"
  | "close"
  | "notification"
  | "profile"
  | "arrow-right"
  | "filter"
  // info
  | "gender-female"
  | "gender-male"
  | "age-cake"
  | "size"
  | "health"
  | "personality"
  | "food-bowl"
  | "walk"
  // activity
  | "camera"
  | "bath"
  | "cleaning"
  | "calendar"
  | "gift"
  | "piggy-bank"
  | "mail"
  | "share"
  // status
  | "check"
  | "pending"
  | "warning"
  | "badge-new"
  | "dog-happy"
  | "dog-sad"
  | "dog-sleep"
  | "flower"
  // contact
  | "location"
  | "phone"
  | "clock"
  | "map"
  | "chat"
  | "social"
  | "copy"
  | "link"

const CATEGORY_OF: Record<BrandIconName, BrandIconCategory> = {
  dog: "main",
  heart: "main",
  "home-shelter": "main",
  adopted: "main",
  volunteer: "main",
  partnership: "main",
  paw: "main",
  star: "main",
  "nav-home": "ui",
  search: "ui",
  menu: "ui",
  close: "ui",
  notification: "ui",
  profile: "ui",
  "arrow-right": "ui",
  filter: "ui",
  "gender-female": "info",
  "gender-male": "info",
  "age-cake": "info",
  size: "info",
  health: "info",
  personality: "info",
  "food-bowl": "info",
  walk: "info",
  camera: "activity",
  bath: "activity",
  cleaning: "activity",
  calendar: "activity",
  gift: "activity",
  "piggy-bank": "activity",
  mail: "activity",
  share: "activity",
  check: "status",
  pending: "status",
  warning: "status",
  "badge-new": "status",
  "dog-happy": "status",
  "dog-sad": "status",
  "dog-sleep": "status",
  flower: "status",
  location: "contact",
  phone: "contact",
  clock: "contact",
  map: "contact",
  chat: "contact",
  social: "contact",
  copy: "contact",
  link: "contact",
}

interface Props {
  name: BrandIconName
  size?: number
  className?: string
  alt?: string
  /** decorative 면 alt="" + aria-hidden 처리 */
  decorative?: boolean
}

/**
 * 왕왕랜드 브랜드 SVG 아이콘.
 * SVG 내부 색상은 하드코딩이라 className 으로 색을 바꾸진 못합니다.
 * 크기 / 정렬만 className 으로 조절하세요.
 */
export function BrandIcon({
  name,
  size = 24,
  className,
  alt,
  decorative = false,
}: Props) {
  const category = CATEGORY_OF[name]
  return (
    <Image
      src={`/images/icons/${category}/${name}.svg`}
      width={size}
      height={size}
      alt={decorative ? "" : (alt ?? name)}
      aria-hidden={decorative || undefined}
      className={cn("inline-block", className)}
      unoptimized
    />
  )
}
