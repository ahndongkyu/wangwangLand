import { listRecentPublishedNotices } from "@/features/notices"
import { getCurrentProfile } from "@/features/members"
import { getPendingCounts } from "@/shared/lib/pending-counts"
import { listMyNotifications, getUnreadCount } from "@/features/notifications/api/queries"
import { Footer } from "@/shared/components/layout/footer"
import { Header } from "@/shared/components/layout/header"
import { MobileCtaBar } from "@/shared/components/mobile-cta-bar"
import { ScrollButtons } from "@/shared/components/scroll-buttons"

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [recentNotices, profile] = await Promise.all([
    listRecentPublishedNotices(20),
    getCurrentProfile(),
  ])

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
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <Footer />
      <ScrollButtons />
      <MobileCtaBar />
    </div>
  )
}
