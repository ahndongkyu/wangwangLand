import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { listRecentPublishedNotices } from "@/features/notices"
import { getCurrentProfile } from "@/features/members"
import { TERMS_VERSION, PRIVACY_VERSION } from "@/features/legal"
import { getPendingCounts } from "@/shared/lib/pending-counts"
import { listMyNotifications, getUnreadCount } from "@/features/notifications/api/queries"
import { Footer } from "@/shared/components/layout/footer"
import { MobileFooter } from "@/shared/components/layout/footer-mobile"
import { Header } from "@/shared/components/layout/header"
import { MobileCtaBar } from "@/shared/components/mobile-cta-bar"
import { KakaoChannelButton } from "@/shared/components/kakao-channel-button"
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
  const [recentNotices, profile] = await Promise.all([
    listRecentPublishedNotices(20),
    getCurrentProfile(),
  ])

  // 약관 가드 — 인증된 승인 회원이 약관/개인정보 미동의 또는 버전 불일치 시
  // 예외 경로가 아니면 /agreement 로 강제 redirect.
  if (profile && profile.status === "approved" && !profile.is_banned) {
    const termsOk =
      !!profile.terms_agreed_at && profile.terms_version === TERMS_VERSION
    const privacyOk =
      !!profile.privacy_agreed_at && profile.privacy_version === PRIVACY_VERSION
    if (!termsOk || !privacyOk) {
      const h = await headers()
      const pathname = h.get("x-pathname") ?? h.get("x-invoke-path") ?? "/"
      if (!isExemptPath(pathname)) {
        redirect("/agreement")
      }
    }
  }

  const isStaff = profile?.role === "staff" || profile?.role === "admin"
  const isApproved = profile?.status === "approved"

  const [pendingCounts, userNotifications, unreadNotificationCount] = await Promise.all([
    isStaff ? getPendingCounts() : Promise.resolve(null),
    isApproved ? listMyNotifications() : Promise.resolve([]),
    isApproved ? getUnreadCount() : Promise.resolve(0),
  ])

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        recentNotices={recentNotices}
        profile={profile}
        pendingCounts={pendingCounts}
        userNotifications={userNotifications}
        unreadNotificationCount={unreadNotificationCount}
      />
      {/* 모바일 하단 CTA 바와 겹치지 않도록 main 하단에 padding */}
      <main className="flex-1 pb-24 md:pb-0">{children}</main>
      <div className="md:hidden"><MobileFooter /></div>
      <div className="hidden md:block"><Footer /></div>
      <KakaoChannelButton />
      <MobileCtaBar />
      {/* 마케팅 동의자에게 자동 푸시 권한 요청 (UI 없음) */}
      <AutoPushPrompt marketingAgreed={!!profile?.marketing_agreed_at} />
    </div>
  )
}
