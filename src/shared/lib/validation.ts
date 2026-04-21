// 공용 입력 검증 유틸 — 서버·클라 양쪽에서 동일 규칙 적용용.

export interface FieldValidation {
  valid: boolean
  error?: string
}

/** 한국 휴대폰/유선 번호: 숫자만 10~11자리, 0으로 시작. 하이픈·공백 허용. */
export function validateKoreanPhone(phone: string): FieldValidation {
  const digits = phone.replace(/\D/g, "")
  if (digits.length < 10 || digits.length > 11 || !digits.startsWith("0")) {
    return {
      valid: false,
      error: "올바른 연락처 형식이 아닙니다. (예: 010-1234-5678)",
    }
  }
  return { valid: true }
}

/** 이름: trim 후 2~30자. */
export function validateName(name: string): FieldValidation {
  const trimmed = name.trim()
  if (trimmed.length < 2) {
    return { valid: false, error: "이름은 2자 이상 입력해주세요." }
  }
  if (trimmed.length > 30) {
    return { valid: false, error: "이름은 30자 이하로 입력해주세요." }
  }
  return { valid: true }
}

/** 인원수: 1~20 사이 정수. 파싱 결과 동봉. */
export function validatePartySize(value: string | number): FieldValidation & {
  partySize?: number
} {
  const n = typeof value === "string" ? Number(value) : value
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > 20) {
    return {
      valid: false,
      error: "인원수는 1~20 사이의 숫자로 입력해주세요.",
    }
  }
  return { valid: true, partySize: n }
}
