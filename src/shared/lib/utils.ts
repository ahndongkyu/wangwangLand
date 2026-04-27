import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** 게시글 리스트용 짧은 날짜 포맷: "04.28" (한국 로케일 기본의 trailing dot 제거) */
export function formatShortDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${m}.${day}`
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
