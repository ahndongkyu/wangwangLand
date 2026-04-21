export const SITE = {
  name: "왕왕랜드",
  nameEn: "wangwangLand",
  tagline: "버려진 아이들의 두 번째 가족",
  subtitle: "영종도 유기견 보호소",
  description: "안락사 없는 따뜻한 유기견 보호소, 왕왕랜드입니다.",
  logo: "/images/logo.png",
  contact: {
    /** 담당자별 연락처. number 빈 값이면 노출되지 않습니다. */
    phones: [
      { label: "대표", number: "" },
      { label: "봉사 담당", number: "" },
      { label: "입양 담당", number: "" },
    ],
    email: "",
    address: "인천 중구 선녀바위로 193 유기견보호소 왕왕랜드",
    /** 지도 앱·내비게이션에 바로 검색 가능한 도로명까지 */
    addressShort: "인천 중구 선녀바위로 193",
    addressNote: "호성이네민박펜션과 주소 동일",
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
    parcelAddress: "인천 중구 선녀바위로 193 유기견보호소 왕왕랜드",
    /** 택배사 주소 입력용 짧은 주소 (도로명 + 번지까지) */
    parcelAddressShort: "인천 중구 선녀바위로 193",
    parcelAddressNote: "호성이네민박펜션과 주소 동일",
  },
  partners: {
    barunPuppyLab: {
      name: "바른퍼피랩",
      url: "https://smartstore.naver.com/barunpuppylab/products/13278162589",
    },
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

// ─────────────────────────────────────────────────────────────────────────────
// Footer 전용 네비게이션 — 주요 서비스 · 참여 · 운영 정보를 분류해 노출.

export const FOOTER_LINK_GROUPS: ReadonlyArray<{
  title: string
  links: ReadonlyArray<{ label: string; href: string }>
}> = [
  {
    title: "서비스",
    links: [
      { label: "강아지", href: "/dogs" },
      { label: "고양이", href: "/cats" },
      { label: "일상", href: "/daily" },
      { label: "입양후기", href: "/stories" },
    ],
  },
  {
    title: "참여 · 정보",
    links: [
      { label: "입양 문의", href: "/adopt" },
      { label: "봉사 신청", href: "/volunteer" },
      { label: "후원하기", href: "/donate" },
      { label: "공지사항", href: "/notice" },
      { label: "센터 소개", href: "/about" },
      { label: "오시는 길", href: "/contact" },
    ],
  },
]

// 저작권 하단에 붙이는 약관 · 정책 링크 — 다른 네비와 섞지 않는다.
export const FOOTER_LEGAL = [
  { label: "개인정보처리방침", href: "/privacy" },
  { label: "이용약관", href: "/terms" },
] as const
