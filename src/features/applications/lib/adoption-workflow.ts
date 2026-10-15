import type { ApplicationStatus } from "@/shared/types/database"

export const ADOPTION_CONTACT = "010-5473-2827"
export const ADOPTION_CONTACT_LABEL = "입양담당팀장"
export type AdoptionSmsKind = "received" | "approved" | "cancelled-applicant" | "cancelled-staff"

export function adoptionStatusLabel(status: ApplicationStatus, completedAt?: string | null) {
  if (completedAt) return "입양 완료"
  if (status === "접수" || status === "검토중") return "승인대기"
  return status === "반려" ? "거절" : status
}

export function adoptionVisitLabel(iso: string | null | undefined) {
  if (!iso || !Number.isFinite(new Date(iso).getTime())) return "일정 미확정"
  const date = new Date(iso)
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul", year: "2-digit", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date).map(p => [p.type, p.value]))
  const hour = Number(parts.hour)
  return `${parts.year}.${parts.month}.${parts.day} ${hour < 12 ? "오전" : "오후"} ${hour % 12 || 12}:${parts.minute}`
}

export function buildAdoptionSms(kind: AdoptionSmsKind, name: string, visitAt?: string | null) {
  const person = name.replace(/[\r\n]+/g, " ").trim()
  const visit = adoptionVisitLabel(visitAt)
  const messages = {
    received: `[왕왕랜드] ${person}님 입양상담 접수\n희망: ${visit}\n일정 확인 후 승인해 주세요.`,
    approved: `[왕왕랜드] ${person}님,\n입양상담 신청이 승인되었습니다.\n방문: ${visit}`,
    "cancelled-applicant": `[왕왕랜드] ${person}님,\n입양상담 신청이 취소되었습니다.`,
    "cancelled-staff": `[왕왕랜드] ${person}님 입양상담 취소\n사유는 홈페이지에서 확인해 주세요.`,
  }
  if (adoptionSmsType(messages[kind]) === "SMS") return messages[kind]
  // 긴 이름도 생략하지 않고 안내만 간결하게 바꿔 단문 요금을 유지한다.
  return {
    received: `[왕왕랜드] ${person}님\n입양 승인요청\n${visit}`,
    approved: `[왕왕랜드] ${person}님\n입양상담 승인\n${visit}`,
    "cancelled-applicant": `[왕왕랜드] ${person}님\n입양상담 취소 완료`,
    "cancelled-staff": `[왕왕랜드] ${person}님 입양취소\n사유: 홈페이지 확인`,
  }[kind]
}

/** 국내 단문 기준: ASCII 1바이트, 한글 등 2바이트. 초과 시 내용을 자르지 않는다. */
export function adoptionSmsType(text: string): "SMS" | "LMS" {
  return [...text].reduce((n, char) => n + (char.charCodeAt(0) < 128 ? 1 : 2), 0) <= 90 ? "SMS" : "LMS"
}

