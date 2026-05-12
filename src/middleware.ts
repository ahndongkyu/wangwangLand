import { NextResponse, type NextRequest } from "next/server"

const CANONICAL_HOST = "wangwangland.kr"
/**
 * 검색엔진 중복 인덱싱 방지용 — production 도메인 외 vercel.app 진입은
 * 운영 도메인으로 301 영구 리다이렉트. 시간 지나면 검색 결과도 통합됨.
 * 브랜치 프리뷰(*-git-...vercel.app) 는 리다이렉트 안 함 — 개발용으로 유지.
 */
const REDIRECT_HOSTS = new Set(["wangwang-land.vercel.app"])

export function middleware(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").toLowerCase()

  if (REDIRECT_HOSTS.has(host)) {
    const url = new URL(request.url)
    url.host = CANONICAL_HOST
    url.protocol = "https:"
    url.port = ""
    return NextResponse.redirect(url.toString(), 301)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // 정적 자원·내부 API 외 모든 경로에 적용
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
