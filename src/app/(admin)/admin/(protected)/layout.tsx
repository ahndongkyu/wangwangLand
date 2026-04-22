import Link from "next/link"
import { redirect } from "next/navigation"

import { getCurrentAdmin, logout } from "@/features/auth"
import { Button } from "@/shared/components/ui/button"
import { SITE } from "@/shared/constants/site"

const ADMIN_NAV = [
  { label: "대시보드", href: "/admin", topOnly: false },
  { label: "강아지", href: "/admin/dogs", topOnly: false },
  { label: "고양이", href: "/admin/cats", topOnly: false },
  { label: "공지", href: "/admin/notices", topOnly: false },
  { label: "일상", href: "/admin/daily", topOnly: false },
  { label: "입양후기", href: "/admin/stories", topOnly: false },
  { label: "신청 관리", href: "/admin/applications", topOnly: false },
  { label: "운영진 관리", href: "/admin/admins", topOnly: true },
] as const

const ROLE_LABEL: Record<string, string> = {
  admin: "최고관리자",
  editor: "관리자",
}

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const admin = await getCurrentAdmin()
  if (!admin) redirect("/admin/login")

  const isTopAdmin = admin.role === "admin"
  const navItems = ADMIN_NAV.filter((i) => !i.topOnly || isTopAdmin)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex items-center gap-6">
            <Link
              href="/admin"
              className="text-base font-bold text-foreground"
            >
              {SITE.name} 관리자
            </Link>
            <nav className="hidden md:block">
              <ul className="flex items-center gap-1 text-sm">
                {navItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="rounded-md px-3 py-1.5 font-medium text-foreground/70 transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {admin.name}{" "}
              <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                {ROLE_LABEL[admin.role] ?? admin.role}
              </span>
            </span>
            <form action={logout}>
              <Button type="submit" variant="outline" size="sm">
                로그아웃
              </Button>
            </form>
          </div>
        </div>
        <nav className="md:hidden">
          <ul className="flex overflow-x-auto border-t border-border px-2 py-2 text-sm">
            {navItems.map((item) => (
              <li key={item.href} className="flex-shrink-0">
                <Link
                  href={item.href}
                  className="rounded-md px-3 py-1.5 font-medium text-foreground/70 hover:bg-secondary"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
