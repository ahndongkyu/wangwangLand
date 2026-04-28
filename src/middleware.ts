import { NextResponse, type NextRequest } from "next/server"

/**
 * 모든 요청에 x-pathname 헤더를 주입.
 * server component(layout.tsx 등)에서 현재 경로를 알아내 가드 분기에 사용.
 */
export function middleware(request: NextRequest) {
  // 요청 헤더 복제 후 x-pathname 추가 → server component 의 headers() 로 읽기 가능
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-pathname", request.nextUrl.pathname)
  return NextResponse.next({
    request: { headers: requestHeaders },
  })
}

export const config = {
  // 정적 자산·내부 라우트는 제외
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/|icons/|robots.txt|sitemap.xml).*)",
  ],
}
