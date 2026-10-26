export const contactFixture = { volunteerPhone: "010-3540-3156", adoptionPhone: "010-5473-2827", kakaoChannel: "http://pf.kakao.com/_iTmxbX/chat", naverCafe: "https://cafe.naver.com/wangwangland", instagram: "https://www.instagram.com/wangwangland_/" }
export const operatingSnapshot = {
  delivery: { data: { recipient: "호성이네", address: "인천 중구 을왕동 206-27", detail: "유기견보호소 왕왕랜드", phone: "", note: "" }, revision: null, error: null },
  contact: { data: contactFixture, revision: null, error: null },
  account: { data: { bankName: "NH농협", accountNumber: "351-1336-8823-03", accountHolder: "왕왕랜드" }, revision: null, error: null },
}
export function operatingFixture(name) {
  if (name === "@/features/settings/api/operating-queries") return { getOperatingInfo: async () => operatingSnapshot }
  if (name === "@/features/settings/components/operating-provider") return { useOperatingContact: () => contactFixture }
}
