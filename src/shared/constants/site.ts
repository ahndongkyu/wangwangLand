export const SITE = {
  name: "왕왕랜드",
  nameEn: "wangwangLand",
  /**
   * 배포 도메인. 런타임에 NEXT_PUBLIC_SITE_URL 로 덮어쓸 수 있다.
   * (예: Vercel 프리뷰에서 자동 주입).
   */
  url:
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://wangwangland.kr",
  tagline: "버려진 아이들의 두 번째 가족",
  subtitle: "영종도 유기견 보호소",
  description: "안락사 없는 따뜻한 유기견 보호소, 왕왕랜드입니다.",
  logo: "/images/wangwang_logo.png",
  /** SNS 공유 시 사용되는 대표 이미지 (1200x630 권장). 없으면 배너 대체. */
  ogImage: "/images/banner.jpeg",
  contact: {
    /** 담당자별 연락처. number 빈 값이면 노출되지 않습니다. */
    phones: [
      { label: "대표", number: "" },
      { label: "봉사 담당", number: "" },
      { label: "입양 담당", number: "" },
    ],
    email: "",
    address: "인천 중구 을왕동 206-27 유기견보호소 왕왕랜드",
    /** 지도 앱·내비게이션에 바로 검색 가능한 지번까지 */
    addressShort: "인천 중구 을왕동 206-27",
    addressNote: "",
    mapQuery: "인천 중구 을왕동 206-27",
    kakaoTalk: "",
  },
  sns: {
    instagram: "https://www.instagram.com/wangwangland_?igsh=aWIycTZwcHZsMDhj",
    naverCafe: "https://cafe.naver.com/wangwangland",
    youtube: "",
  },
  donation: {
    bankName: "NH농협",
    accountNumber: "351-1336-8823-03",
    accountHolder: "왕왕랜드",
    regularMinimum: 10000,
    parcelRecipient: "호성이네",
    parcelAddress: "인천 중구 을왕동 206-27 유기견보호소 왕왕랜드",
    /** 택배사 주소 입력용 짧은 주소 (지번까지) */
    parcelAddressShort: "인천 중구 을왕동 206-27",
    parcelAddressNote: "",
  },
  partners: {
    barunPuppyLab: {
      name: "바른퍼피랩",
      url: "https://naver.me/GprxU7ii",
    },
  },
  /**
   * 단체 등록 정보. 빈 문자열이면 해당 항목은 푸터에서 자동 숨김.
   * 공익성 승격 전이라 기부금 영수증 발급 불가 상태.
   */
  registration: {
    representativeName: "박순덕", // 대표자명
    representativeBirth: "1965년 11월 1일생",
    shelterNumber: "", // 동물보호센터 등록번호 (있다면)
    /**
     * 국세청 고유번호 — 수익사업을 하지 않는 비영리법인.
     * 사업자등록번호와 형식은 같지만 의미가 다르므로 표기 시 "고유번호" 로 명시.
     */
    taxId: "222-82-77099",
    /** @deprecated taxId 사용 — 호환성을 위해 유지 */
    businessNumber: "222-82-77099",
    issuedAt: "2024년 09월 05일",
    issuedBy: "인천세무서",
  },
}

export const MAIN_NAV = [
  { label: "센터소개", href: "/about" },
  { label: "강아지", href: "/dogs" },
  { label: "고양이", href: "/cats" },
  { label: "일상", href: "/daily" },
  { label: "입양후기", href: "/stories" },
  { label: "봉사", href: "/volunteer" },
  { label: "후원", href: "/donate" },
  { label: "공지사항", href: "/notice" },
] as const

/**
 * 데스크톱 헤더 — 드롭다운 그룹으로 재편.
 * 모바일에선 MAIN_NAV 를 그대로 나열 (햄버거 시트).
 */
export interface HeaderNavItem {
  label: string
  href: string
  desc?: string
  /**
   * BrandIcon 의 name (string). site.ts 에서 BrandIconName import 하면 순환
   * 위험이 있어 string 으로 두고 사용처(Header)에서 캐스팅한다.
   */
  icon?: string
}

export const HEADER_NAV_GROUPS: ReadonlyArray<
  | { kind: "link"; label: string; href: string }
  | {
      kind: "group"
      label: string
      items: ReadonlyArray<HeaderNavItem>
    }
> = [
  {
    kind: "group",
    label: "아이들 만나기",
    items: [
      { label: "강아지", href: "/dogs", desc: "입양 대기 중인 강아지들", icon: "dog" },
      { label: "고양이", href: "/cats", desc: "보호 중인 고양이들", icon: "paw" },
      { label: "입양 후기", href: "/stories", desc: "새 가족을 만난 아이들", icon: "heart" },
      { label: "일상", href: "/daily", desc: "봉사 활동·근황 기록", icon: "camera" },
    ],
  },
  {
    kind: "group",
    label: "참여",
    items: [
      { label: "일정", href: "/calendar", desc: "다가오는 봉사·행사", icon: "calendar" },
      { label: "봉사 신청", href: "/volunteer", desc: "매주 봉사자를 기다려요", icon: "volunteer" },
      { label: "후원하기", href: "/donate", desc: "작은 정성이 큰 힘이 됩니다", icon: "gift" },
      { label: "후원 감사글", href: "/thanks", desc: "도착한 따뜻한 마음", icon: "heart" },
    ],
  },
  { kind: "link", label: "공지사항", href: "/notice" },
  { kind: "link", label: "센터소개", href: "/about" },
]

// ─────────────────────────────────────────────────────────────────────────────
// Footer 전용 네비게이션 — 주요 서비스 · 참여 · 운영 정보를 분류해 노출.

export const FOOTER_LINK_GROUPS: ReadonlyArray<{
  title: string
  links: ReadonlyArray<{ label: string; href: string }>
}> = [
  {
    title: "아이들 만나기",
    links: [
      { label: "강아지", href: "/dogs" },
      { label: "고양이", href: "/cats" },
      { label: "입양 후기", href: "/stories" },
      { label: "일상", href: "/daily" },
    ],
  },
  {
    title: "함께하기",
    links: [
      { label: "입양 문의", href: "/adopt" },
      { label: "봉사 신청", href: "/volunteer" },
      { label: "일정 바로가기", href: "/calendar" },
      { label: "후원하기", href: "/donate" },
    ],
  },
  {
    title: "정보",
    links: [
      { label: "센터 소개", href: "/about" },
      { label: "공지사항", href: "/notice" },
      { label: "오시는 길", href: "/contact" },
    ],
  },
]

// 저작권 하단에 붙이는 약관 · 정책 링크 — 다른 네비와 섞지 않는다.
export const FOOTER_LEGAL = [
  { label: "개인정보처리방침", href: "/privacy" },
  { label: "이용약관", href: "/terms" },
] as const
