export const SITE = {
  name: "왕왕랜드",
  nameEn: "wangwangLand",
  tagline: "버려진 아이들의 두 번째 가족",
  description: "안락사 없는 따뜻한 유기견 보호소, 왕왕랜드입니다.",
  contact: {
    phone: "",
    email: "beez_12@naver.com",
    address: "",
    kakaoTalk: "",
  },
  sns: {
    instagram: "",
    naverCafe: "",
    youtube: "",
  },
  donation: {
    bankName: "",
    accountNumber: "",
    accountHolder: "",
  },
}

export const MAIN_NAV = [
  { label: "센터소개", href: "/about" },
  { label: "입양하기", href: "/dogs" },
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
