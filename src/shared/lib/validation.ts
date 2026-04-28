// 공용 입력 검증 유틸 — 서버·클라 양쪽에서 동일 규칙 적용용.
// - validateName: 개인 이름 (한글·영문·공백, 2~20자)
// - validateOrgOrPersonName: 단체명/회사명까지 허용 (한·영·숫자·공백·· · - · _, 2~30자)
// - validateNickname: 닉네임 (한·영·숫자·_, 2~20자)
// - validateKoreanPhone: 한국 전화번호
// - validatePartySize: 인원수 1~20

export interface FieldValidation {
  valid: boolean
  error?: string
}

// ─── 정규식 (HTML pattern attribute 와 동일하게 쓸 수 있도록 ^ $ 포함) ─────────
export const NAME_PATTERN_RAW = "[가-힣A-Za-z]+(?:\\s[가-힣A-Za-z]+)*"
export const NAME_PATTERN = new RegExp(`^${NAME_PATTERN_RAW}$`)

export const ORG_OR_PERSON_PATTERN_RAW =
  "[가-힣A-Za-z0-9]+(?:[\\s·\\-_][가-힣A-Za-z0-9]+)*"
export const ORG_OR_PERSON_PATTERN = new RegExp(`^${ORG_OR_PERSON_PATTERN_RAW}$`)

export const NICKNAME_PATTERN_RAW = "[가-힣A-Za-z0-9_]+"
export const NICKNAME_PATTERN = new RegExp(`^${NICKNAME_PATTERN_RAW}$`)

export const KOREAN_PHONE_PATTERN_RAW = "0\\d{1,2}-?\\d{3,4}-?\\d{4}"
export const KOREAN_PHONE_PATTERN = new RegExp(`^${KOREAN_PHONE_PATTERN_RAW}$`)

// ─── 안내 문구 (input title 속성 등에 재사용) ────────────────────────────────
export const NAME_HINT = "한글·영문만 사용 가능합니다 (2~20자)"
export const ORG_OR_PERSON_HINT =
  "한글·영문·숫자·공백·하이픈만 사용 가능합니다 (2~30자)"
export const NICKNAME_HINT = "한글·영문·숫자·_ 만 사용 가능합니다 (2~20자)"
export const PHONE_HINT = "예: 010-1234-5678"

// ─── 함수 ────────────────────────────────────────────────────────────────────

/** 한국 휴대폰/유선 번호: 숫자만 10~11자리, 0으로 시작. */
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

/** 개인 이름: 2~20자, 한글·영문·공백만. 숫자·특수문자 불가. */
export function validateName(name: string): FieldValidation {
  const trimmed = name.trim()
  if (trimmed.length < 2) {
    return { valid: false, error: "이름은 2자 이상 입력해주세요." }
  }
  if (trimmed.length > 20) {
    return { valid: false, error: "이름은 20자 이하로 입력해주세요." }
  }
  if (!NAME_PATTERN.test(trimmed)) {
    return {
      valid: false,
      error: "이름은 한글·영문만 입력 가능합니다. (숫자·특수문자 불가)",
    }
  }
  return { valid: true }
}

/**
 * 단체명/회사명/인솔자명까지 허용하는 느슨한 이름 검증.
 * - 한글·영문·숫자·공백·· · - · _ 만 허용 (2~30자)
 * - 사용처: 봉사 단체 신청, 후원자명 (회사 후원 가능)
 */
export function validateOrgOrPersonName(name: string): FieldValidation {
  const trimmed = name.trim()
  if (trimmed.length < 2) {
    return { valid: false, error: "2자 이상 입력해주세요." }
  }
  if (trimmed.length > 30) {
    return { valid: false, error: "30자 이하로 입력해주세요." }
  }
  if (!ORG_OR_PERSON_PATTERN.test(trimmed)) {
    return {
      valid: false,
      error:
        "한글·영문·숫자·공백·하이픈만 입력 가능합니다. (이모지·특수문자 불가)",
    }
  }
  return { valid: true }
}

/** 닉네임: 2~20자, 한글·영문·숫자·_. */
export function validateNickname(name: string): FieldValidation {
  const trimmed = name.trim()
  if (trimmed.length < 2) {
    return { valid: false, error: "닉네임은 2자 이상 입력해주세요." }
  }
  if (trimmed.length > 20) {
    return { valid: false, error: "닉네임은 20자 이하로 입력해주세요." }
  }
  if (!NICKNAME_PATTERN.test(trimmed)) {
    return {
      valid: false,
      error:
        "닉네임은 한글·영문·숫자·_ 만 사용 가능합니다.",
    }
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
