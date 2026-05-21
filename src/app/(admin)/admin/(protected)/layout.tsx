import { redirect } from "next/navigation"
import { getCurrentAdmin, logout } from "@/features/auth"
import { getPendingCounts } from "@/shared/lib/pending-counts"
import { SITE } from "@/shared/constants/site"
import { AdminSidebar, AdminMobileHeader } from "./_components/admin-header"
import { AdminBottomNav } from "./_components/admin-bottom-nav"

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const admin = await getCurrentAdmin()
  if (!admin) redirect("/admin/login")

  const [pendingCounts] = await Promise.all([getPendingCounts()])
  const isTopAdmin = admin.role === "admin"

  const sharedProps = {
    siteName: SITE.name,
    adminName: admin.nickname,
    adminRole: admin.role,
    adminAvatarUrl: admin.avatar_url ?? null,
    isTopAdmin,
    logoutAction: logout,
  }

  return (
    <div className="flex min-h-screen bg-background md:bg-[#FAFAF7] dark:md:bg-[#151B17]">
      {/* PC 사이드바 — md 이상만 표시 */}
      <AdminSidebar {...sharedProps} pendingCounts={pendingCounts} />

      {/* 콘텐츠 영역 */}
      <div className="flex min-w-0 flex-1 flex-col md:pl-[240px] md:bg-[#FAFAF7] dark:md:bg-[#151B17]">
        {/* 모바일 헤더 — md 이상에서 숨김 */}
        <AdminMobileHeader {...sharedProps} pendingCounts={pendingCounts} />

        <main className="min-w-0 flex-1 overflow-x-hidden pb-24 md:pb-0">{children}</main>
      </div>

      {/* 모바일 하단탭 */}
      <AdminBottomNav counts={pendingCounts} />
    </div>
  )
}
