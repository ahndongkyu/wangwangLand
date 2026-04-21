export const SITE = {
  name: "왕왕랜드",
  nameEn: "wangwangLand",
  tagline: "버려진 아이들의 두 번째 가족",
  subtitle: "영종도 유기견 보호소",
  description: "안락사 없는 따뜻한 유기견 보호소, 왕왕랜드입니다.",
  logo: "/images/logo.png",
  contact: {
    phone: "",
    email: "",
    address: "인천 중구 선녀바위로 193 유기견보호소 왕왕랜드",
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
    parcelAddressNote: "호성이네민박펜션과 주소 동일",
  },
  partners: {
    // TODO: 바른퍼피랩 실제 네이버 스토어 URL로 수정
    barunPuppyLab: {
      name: "바른퍼피랩",
      url: "https://smartstore.naver.com/barunpuppylab",
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

export const FOOTER_NAV = [
  { label: "센터소개", href: "/about" },
  { label: "오시는 길", href: "/contact" },
  { label: "개인정보처리방침", href: "/privacy" },
  { label: "이용약관", href: "/terms" },
] as const
