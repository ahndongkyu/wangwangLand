import { NextResponse, type NextRequest } from "next/server"

/**
 * 강제 점검 모드 — 환경변수 MAINTENANCE_MODE=true 일 때 모든 요청을 /maintenance 로 리다이렉트.
 * DB·Auth 가 다운되어 어드민 토글을 못 누르는 비상 상황용.
 */
export function middleware(request: NextRequest) {
  const isMaintenance = process.env.MAINTENANCE_MODE === "true"
  const { pathname } = request.nextUrl

  if (!isMaintenance) return NextResponse.next()

  // /maintenance 페이지 자체와 정적 자원은 통과
  if (
    pathname.startsWith("/maintenance") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/favicon") ||
    pathname === "/sw.js" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  ) {
    return NextResponse.next()
  }

  return NextResponse.redirect(new URL("/maintenance", request.url))
}

export const config = {
  matcher: [
    // 정적 파일 제외 모든 경로
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
