export type MobileHeaderRoute = { title: string; href: string }

/** 상세·작성 화면만 뒤로가기를 표시한다. 목록과 홈은 기존 브랜드를 유지한다. */
export function mobileHeaderRoute(pathname: string): MobileHeaderRoute | null {
  const path = pathname.replace(/\/$/, "")
  const application = path.match(/^\/admin\/applications\/(volunteer|adoption)\/[^/]+$/)
  if (application) return { title: application[1] === "volunteer" ? "봉사 신청 상세" : "입양 상담 상세", href: `/admin/applications?type=${application[1]}` }
  if (/^\/my\/applications\/(volunteer|adoption)\//.test(path)) return { title: path.includes("/volunteer/") ? "봉사 신청 내역" : "입양 상담 내역", href: "/my/applications" }
  const admin = path.match(/^\/admin\/(members|admins|sms|logs|donations|calendar|dogs|cats|notices|daily|stories|thanks|expenses)\/(.+)$/)
  if (admin) {
    const names: Record<string, string> = { members: "회원", admins: "운영진", sms: "SMS 발송", logs: "오류 로그", donations: "후원", calendar: "일정", dogs: "강아지", cats: "고양이", notices: "공지사항", daily: "왕왕랜드 이야기", stories: "후기", thanks: "후원 이야기", expenses: "지출 내역" }
    return { title: `${names[admin[1]]} ${admin[2] === "new" ? "등록" : admin[2].endsWith("/edit") ? "수정" : "상세"}`, href: ["daily", "stories", "thanks"].includes(admin[1]) ? "/admin/community" : `/admin/${admin[1]}` }
  }
  const publicDetail = path.match(/^\/(notice|daily|stories|thanks|expenses|dogs|cats|calendar)\/(.+)$/)
  if (publicDetail && !["grid", "list"].includes(publicDetail[2])) {
    const names: Record<string, string> = { notice: "공지사항", daily: "왕왕랜드 이야기", stories: "왕왕랜드 이야기", thanks: "왕왕랜드 이야기", expenses: "지출 내역", dogs: "아이 소개", cats: "아이 소개", calendar: "일정 상세" }
    return { title: names[publicDetail[1]], href: ["stories", "thanks"].includes(publicDetail[1]) ? "/daily" : `/${publicDetail[1]}` }
  }
  if (path === "/donate/register" || path === "/donate/register/done") return { title: "후원 신청", href: "/donate" }
  return null
}

/** 외부 URL·다른 관리 화면으로 이동시키는 returnTo는 사용하지 않는다. */
export function mobileHeaderReturnHref(route: MobileHeaderRoute, candidate: string | null): string {
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//") || /[\\\u0000-\u0020]/.test(candidate)) return route.href
  const url = new URL(candidate, "https://local.invalid")
  const fallback = new URL(route.href, "https://local.invalid")
  const allowed = [fallback.pathname]
  if (fallback.pathname === "/admin/applications") allowed.push("/admin/calendar", "/admin", "/calendar", "/")
  return url.origin === fallback.origin && allowed.includes(url.pathname) ? `${url.pathname}${url.search}${url.hash}` : route.href
}
