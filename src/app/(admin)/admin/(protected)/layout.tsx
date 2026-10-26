import { redirect } from "next/navigation"
import { getCurrentAdmin, logout } from "@/features/auth"
import { getPendingCounts } from "@/shared/lib/pending-counts"
import { SITE } from "@/shared/constants/site"
import { AdminSidebar, AdminHeader } from "./_components/admin-header"
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
    <div data-admin-scope className="min-h-screen bg-background">
      <AdminHeader {...sharedProps} pendingCounts={pendingCounts} />
      <div className="mx-auto grid w-full max-w-[1440px] min-w-0 items-start md:min-h-[calc(100dvh-5rem)] md:grid-cols-[252px_minmax(0,1fr)] md:gap-6 md:px-6 lg:gap-8 lg:px-8">
        <AdminSidebar {...sharedProps} pendingCounts={pendingCounts} />
        <main className="min-w-0 pb-24 md:col-start-2 md:py-6">{children}</main>
      </div>

      {/* 모바일 하단탭 */}
      <AdminBottomNav counts={pendingCounts} />
    </div>
  )
}
