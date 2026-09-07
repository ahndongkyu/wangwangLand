import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { listRecentPublishedNotices } from "@/features/notices"
import { getCurrentProfile, listMyHomeFavorites } from "@/features/members"
import { TERMS_VERSION, PRIVACY_VERSION } from "@/features/legal"
import { getPendingCounts } from "@/shared/lib/pending-counts"
import { listMyNotifications, getUnreadCount } from "@/features/notifications/api/queries"
import { Footer } from "@/shared/components/layout/footer"
import { MobileFooter } from "@/shared/components/layout/footer-mobile"
import { Header } from "@/shared/components/layout/header"
import { PublicShell } from "@/shared/components/layout/public-shell"
import { MobileCtaBar } from "@/shared/components/mobile-cta-bar"
import { ScrollToTopButton } from "@/shared/components/kakao-channel-button"
import { HomeSidebar } from "@/shared/components/home-sidebar"
import { AutoPushPrompt } from "@/features/push"

// 헤더의 NEW 뱃지·알림 등은 1분 캐시 허용 — 첫 페이지 로드 빨라짐.
export const revalidate = 60

/**
 * 약관 가드 예외 경로 — 이 경로들은 약관 미동의 상태에서도 접근 가능
 *  - /agreement: 재동의 페이지 본인
 *  - /onboarding: 신규 가입 흐름 (자체적으로 약관 체크 + 처리)
 *  - /pending, /rejected: 가입 상태별 안내 페이지
 *  - /terms, /privacy: 약관 본문 (직접 읽기용)
 *  - /login: 로그아웃·재로그인 흐름
 */
const AGREEMENT_GUARD_EXEMPT = [
  "/agreement",
  "/onboarding",
  "/pending",
  "/rejected",
  "/terms",
  "/privacy",
  "/login",
  "/profile",
]

function isExemptPath(pathname: string): boolean {
  return AGREEMENT_GUARD_EXEMPT.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  )
}

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [recentNotices, profile, homeFavorites] = await Promise.all([
    listRecentPublishedNotices(20),
    getCurrentProfile(),
    listMyHomeFavorites(),
  ])

  if (profile && profile.status === "approved" && !profile.is_banned) {
    const h = await headers()
    const pathname = h.get("x-pathname") ?? h.get("x-invoke-path") ?? "/"

    // 핸드폰번호 없는 회원 → 프로필 설정으로 강제 redirect
    if (!profile.phone && !isExemptPath(pathname)) {
      redirect("/profile")
    }

    // 약관 가드 — 약관/개인정보 미동의 또는 버전 불일치 시 /agreement 로 강제 redirect
    const termsOk =
      !!profile.terms_agreed_at && profile.terms_version === TERMS_VERSION
    const privacyOk =
      !!profile.privacy_agreed_at && profile.privacy_version === PRIVACY_VERSION
    if (!termsOk || !privacyOk) {
      if (!isExemptPath(pathname)) {
        redirect("/agreement")
      }
    }
  }

  const isStaff = profile?.role === "staff" || profile?.role === "admin"
  const isApproved = profile?.status === "approved"

  const [
    pendingCounts,
    userNotifications,
    unreadNotificationCount,
  ] = await Promise.all([
    isStaff ? getPendingCounts() : Promise.resolve(null),
    isApproved ? listMyNotifications() : Promise.resolve([]),
    isApproved ? getUnreadCount() : Promise.resolve(0),
  ])

  const sidebarProps = {
    profile,
    initialFavorites: homeFavorites,
    pendingCounts,
    userNotifications,
    unreadNotificationCount,
  }

  return (
    <div data-public-scope className="flex min-h-screen flex-col bg-background">
      <Header
        recentNotices={recentNotices}
        profile={profile}
        mobileSidebar={
          <HomeSidebar
            key={`mobile-${homeFavorites.join("-")}`}
            {...sidebarProps}
            variant="mobile"
          />
        }
      />
      <PublicShell
        sidebar={
          <HomeSidebar
            key={`desktop-${homeFavorites.join("-")}`}
            {...sidebarProps}
          />
        }
      >
        {children}
      </PublicShell>
      <div className="md:hidden"><MobileFooter /></div>
      <div className="hidden md:block"><Footer /></div>
      <ScrollToTopButton />
      <MobileCtaBar />
      {/* 마케팅 동의자에게 자동 푸시 권한 요청 (UI 없음) */}
      <AutoPushPrompt marketingAgreed={!!profile?.marketing_agreed_at} />
    </div>
  )
}
