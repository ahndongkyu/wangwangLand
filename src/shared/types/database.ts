export type DogStatus = "보호중" | "임시보호중" | "입양완료" | "무지개다리"
export type DogGender = "수컷" | "암컷" | "미상"
export type DogSize = "소" | "중소" | "중" | "중대" | "대" | "대대"
export type ApplicationStatus = "접수" | "검토중" | "승인" | "반려"
export type AdminRole = "admin" | "staff"
export type VolunteerActivity = "산책" | "목욕·미용" | "청소·정리" | "홍보·촬영"
export type HousingType = "아파트" | "주택" | "빌라" | "오피스텔" | "기타"
export type OwnershipType = "자가" | "전세" | "월세"

export interface Admin {
  id: string
  user_id: string
  email: string
  name: string
  role: AdminRole
  created_at: string
}

interface AnimalBase {
  id: string
  name: string
  breed: string | null
  gender: DogGender
  /** 생년월일 (정확히 알 때) — 우선순위 ↑, 있으면 이로부터 나이 계산. */
  birth_date: string | null
  /** 생년월일 모를 때 직접 입력하는 폴백 개월수. */
  age_months: number | null
  weight_kg: number | null
  rescue_date: string | null
  status: DogStatus
  description: string | null
  personality: string | null
  health_info: string | null
  kennel_location: string | null
  neutered: boolean | null
  images: string[]
  thumbnail_index: number
  /** 상세 페이지 조회수 (세션 1회 집계) */
  view_count: number
  /** 관심 하트 총 수 (사용자별 토글) */
  like_count: number
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface Dog extends AnimalBase {
  size: DogSize | null
  is_pinned: boolean
  pin_order: number | null
}

export interface Cat extends AnimalBase {}

export interface Notice {
  id: string
  title: string
  content: string
  is_pinned: boolean
  images: string[]
  published_at: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  view_count: number
}

export type DailyCategory = "구조 소식" | "봉사 현장" | "시설 안내" | "일상" | "입소" | "임시보호" | "후원 소식"

export interface DailyPost {
  id: string
  title: string
  content: string | null
  images: string[]
  posted_at: string
  created_at: string
  created_by: string | null
  view_count: number
  category: DailyCategory | null
}

export interface AdoptionStory {
  id: string
  dog_id: string | null
  title: string
  content: string
  images: string[]
  published_at: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  view_count: number
}

export type DonationType = "cash" | "goods"
export type DonationStatus = "pending" | "approved" | "rejected"

export interface Donation {
  id: string
  donor_name: string
  phone: string | null
  email: string
  user_id: string | null
  display_name: string | null
  is_anonymous: boolean
  message: string | null
  type: DonationType
  amount: number | null
  item_description: string | null
  item_quantity: string | null
  donated_at: string
  status: DonationStatus
  approved_at: string | null
  approved_by: string | null
  rejection_reason: string | null
  receipt_issued: boolean
  receipt_issued_at: string | null
  created_at: string
  updated_at: string
}

export interface AdoptionApplication {
  id: string
  dog_id: string | null
  cat_id: string | null
  applicant_name: string
  phone: string
  email: string | null
  address: string
  reason: string
  family_size: number | null
  has_children: boolean | null
  housing_type: HousingType | null
  ownership_type: OwnershipType | null
  current_pets: string | null
  past_pet_experience: string | null
  privacy_agreed: boolean
  status: ApplicationStatus
  admin_note: string | null
  submitted_at: string
  updated_at: string
  created_by: string | null
}

export interface VolunteerApplication {
  id: string
  applicant_name: string
  phone: string
  email: string | null
  party_size: number
  available_days: string[]
  /** 회원이 캘린더 픽커에서 선택한 가능 날짜 (YYYY-MM-DD). available_days 보다 우선. */
  available_dates: string[]
  available_time: string | null
  activities: VolunteerActivity[]
  message: string | null
  privacy_agreed: boolean
  status: ApplicationStatus
  admin_note: string | null
  submitted_at: string
  updated_at: string
  created_by: string | null
}

/** 운영진 상주 일정 — 봉사자에게 그 날 누가 출근하는지 알리기 위한 데이터 */
export interface StaffAvailability {
  id: string
  user_id: string
  /** 대리 등록자 — 본인 등록 시 user_id 와 동일, 다른 운영진이 등록한 경우 그 사람의 id */
  registered_by_id: string | null
  date: string // YYYY-MM-DD
  start_time: string | null // HH:MM:SS, null 이면 종일
  end_time: string | null
  note: string | null
  created_at: string
  updated_at: string
}
