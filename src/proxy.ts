import { type NextRequest, NextResponse } from "next/server"
import { updateSession } from "@/shared/lib/supabase/middleware"

// Edge-compatible 인메모리 캐시 (30초 TTL)
let _cache: { on: boolean; ts: number } | null = null
const CACHE_TTL = 30_000

async function getMaintenanceMode(): Promise<boolean> {
  const now = Date.now()
  if (_cache && now - _cache.ts < CACHE_TTL) return _cache.on
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/app_settings?key=eq.maintenance_mode&select=value`,
      {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        },
        cache: "no-store",
      }
    )
    const rows = await res.json()
    const on = rows?.[0]?.value === true
    _cache = { on, ts: now }
    return on
  } catch {
    return _cache?.on ?? false
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 항상 통과: 어드민, API, 정적 파일, 점검 페이지 자체
  const bypass =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next") ||
    pathname === "/maintenance" ||
    /\.[a-z0-9]+$/i.test(pathname)

  if (!bypass) {
    const isOn = await getMaintenanceMode()
    if (isOn) {
      const url = request.nextUrl.clone()
      url.pathname = "/maintenance"
      return NextResponse.redirect(url)
    }
  }

  return updateSession(request)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
