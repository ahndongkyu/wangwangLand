import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const postDateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
})

function postDateParts(date: string | Date) {
  const value = typeof date === "string" ? new Date(date) : date
  if (Number.isNaN(value.getTime())) return null
  return Object.fromEntries(postDateFormatter.formatToParts(value).map(({ type, value }) => [type, value]))
}

/** 게시글 목록용 한국 시간 날짜: "26.10.06" */
export function formatShortDate(date: string | Date): string {
  const parts = postDateParts(date)
  return parts ? `${parts.year.slice(-2)}.${parts.month}.${parts.day}` : "—"
}

/** 게시글 상세용 한국 시간 날짜·시각: "2026.10.06 14:30" */
export function formatPostDateTime(date: string | Date): string {
  const parts = postDateParts(date)
  return parts ? `${parts.year}.${parts.month}.${parts.day} ${parts.hour}:${parts.minute}` : "—"
}

/** 목록용 한국 시간 날짜·시각: "26.10.08 13:13" */
export function formatShortDateTime(date: string | Date): string {
  const parts = postDateParts(date)
  return parts ? `${parts.year.slice(-2)}.${parts.month}.${parts.day} ${parts.hour}:${parts.minute}` : "—"
}

/** HTML 콘텐츠에서 모든 <img src> URL 추출 (썸네일·갤러리 자동 생성용) */
export function extractImagesFromHtml(html: string): string[] {
  const matches = [...html.matchAll(/<img[^>]+src="([^"]+)"/g)]
  return matches.map((m) => m[1]).filter(Boolean)
}

/** HTML 태그를 제거하고 plain text만 반환 (카드 미리보기용) */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

/**
 * 이름 가운데 글자 마스킹
 * "홍길동" → "홍*동" / "김철" → "김*" / "남궁민준" → "남**준"
 */
export function maskName(name: string): string {
  if (!name || name.length <= 1) return name
  if (name.length === 2) return name[0] + "*"
  return name[0] + "*".repeat(name.length - 2) + name[name.length - 1]
}
