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
}

export interface DailyPost {
  id: string
  title: string
  content: string | null
  images: string[]
  posted_at: string
  created_at: string
  created_by: string | null
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
}

export interface VolunteerApplication {
  id: string
  applicant_name: string
  phone: string
  email: string | null
  party_size: number
  available_days: string[]
  available_time: string | null
  activities: VolunteerActivity[]
  message: string | null
  privacy_agreed: boolean
  status: ApplicationStatus
  admin_note: string | null
  submitted_at: string
  updated_at: string
}
