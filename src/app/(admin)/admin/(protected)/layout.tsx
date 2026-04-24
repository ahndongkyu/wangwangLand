import { redirect } from "next/navigation"
import { getCurrentAdmin, logout } from "@/features/auth"
import { getPendingCounts } from "@/shared/lib/pending-counts"
import { SITE } from "@/shared/constants/site"
import { AdminHeader } from "./_components/admin-header"

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const admin = await getCurrentAdmin()
  if (!admin) redirect("/admin/login")

  const [pendingCounts] = await Promise.all([getPendingCounts()])
  const isTopAdmin = admin.role === "admin"

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AdminHeader
        siteName={SITE.name}
        adminName={admin.nickname}
        adminRole={admin.role}
        isTopAdmin={isTopAdmin}
        logoutAction={logout}
        pendingCounts={pendingCounts}
      />
      <main className="flex-1">{children}</main>
    </div>
  )
}
