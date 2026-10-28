import assert from "node:assert/strict"
import test from "node:test"
import fs from "node:fs"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { load } from "./helpers/page-review-fixtures.mjs"

const el = React.createElement
const imports = {
  "next/link": { default: ({ children, ...props }) => el("a", props, children) },
  "next/navigation": { usePathname: () => "/admin/settings/contact", useSearchParams: () => new URLSearchParams() },
  "@/shared/lib/utils": { cn: (...args) => args.filter(Boolean).join(" ") },
  "@/shared/components/header-logo": { HeaderLogo: ({ className }) => el("span", { className, "data-logo": "public" }) },
  "@/shared/components/admin-logo": { AdminLogo: () => el("span", { "data-logo": "admin" }) },
  "@/shared/components/header-profile": { HeaderProfile: ({ name }) => el("a", { href: name ? "/my" : "/login" }, name ?? "로그인") },
  "@/shared/components/mobile-header-menu": { MobileHeaderMenu: ({ children }) => el("section", { "data-menu": "mobile" }, children) },
  "@/shared/components/mobile-header-title": { MobileHeaderTitle: ({ children }) => children },
  "@/shared/components/theme-toggle": { ThemeToggle: () => el("button", null, "테마") },
  "@/shared/components/admin-notification-bell": { AdminNotificationBell: ({ counts }) => el("button", null, `운영 알림 ${counts.total}`) },
  "@/shared/components/user-notification-bell": { UserNotificationBell: ({ unreadCount }) => el("button", null, `회원 알림 ${unreadCount}`) },
}
const { Header } = load("src/shared/components/layout/header.tsx", imports)
const { AdminHeader, AdminSidebar } = load("src/app/(admin)/admin/(protected)/_components/admin-header.tsx", imports)
const props = { adminName: "운영자", adminRole: "admin", isTopAdmin: true, logoutAction: "#", pendingCounts: { total: 2, volunteers: 1, adoptions: 1 } }

test("public header preserves channel order and gates management link by role", () => {
  for (const role of ["member", "staff", "admin"]) {
    const html = renderToStaticMarkup(el(Header, { profile: { nickname: "회원", role }, unreadNotificationCount: 3 }))
    assert.ok(html.indexOf("카카오톡") < html.indexOf(">카페<"))
    assert.ok(html.indexOf(">카페<") < html.indexOf(">인스타<"))
    assert.equal(html.includes('href="/admin"'), role !== "member")
    assert.match(html, /href="\/my"/)
    assert.match(html, /회원 알림 3/)
    assert.match(html, /w-\[132px\] lg:w-\[192px\]/)
    assert.match(html, /aria-label="외부 채널 및 관리자" class="hidden items-center gap-3 lg:flex"/)
  }
})
test("guest header offers login without private account notifications", () => {
  const html = renderToStaticMarkup(el(Header, {}))
  assert.match(html, /href="\/login"/)
  assert.doesNotMatch(html, /회원 알림|운영 알림|href="\/admin"/)
})
test("administrator header owns profile, main site link and notifications", () => {
  const html = renderToStaticMarkup(el(AdminHeader, props))
  assert.match(html, /왕왕랜드 관리자/)
  assert.doesNotMatch(html, /data-logo="admin"/)
  assert.match(html, /운영 알림 2/)
  assert.match(html, /href="\/my"/)
  assert.match(html, /메인 페이지/)
})
test("administrator sidebar scrolls with the page and opens the active group", () => {
  const html = renderToStaticMarkup(el(AdminSidebar, props))
  assert.doesNotMatch(html, /fixed|overflow-y-auto|href="\/my"|운영 알림/)
  assert.match(html, /<details[^>]*open=""[^>]*>[\s\S]*?운영 설정/)
  assert.match(html, /href="\/admin\/settings\/contact" aria-current="page"/)
  assert.doesNotMatch(html, /chevron/)
  const staffHtml = renderToStaticMarkup(el(AdminSidebar, { ...props, isTopAdmin: false }))
  assert.doesNotMatch(staffHtml, /href="\/admin\/(logs|admins|settings\/maintenance)"/)
})
test("mobile menu uses a single full-width accessible dialog with safe-area spacing", () => {
  const source = fs.readFileSync("src/shared/components/mobile-header-menu.tsx", "utf8")
  assert.match(source, /SheetTitle/)
  assert.match(source, /data-\[side=right\]:w-full/)
  assert.match(source, /env\(safe-area-inset-bottom\)/)
  assert.match(source, /closest\("a"\)/)
  assert.equal((source.match(/overflow-y-auto/g) ?? []).length, 1)
})

test("integrated admin navigation shares theme-aware surfaces on desktop and mobile", () => {
  const sidebar = renderToStaticMarkup(el(AdminSidebar, props))
  const header = renderToStaticMarkup(el(AdminHeader, props))
  assert.match(sidebar, /self-stretch.*border-r border-border/)
  assert.doesNotMatch(sidebar + header, /bg-admin-nav|text-admin-nav|border-white|text-white|shadow-sm/)
  assert.match(sidebar, /open:bg-muted/)
  assert.match(sidebar, /bg-accent font-semibold text-\[var\(--brand-action-hover\)\]/)
  assert.match(sidebar, /focus-visible:ring-ring/)
  const layout = fs.readFileSync("src/app/(admin)/admin/(protected)/layout.tsx", "utf8")
  assert.match(layout, /md:min-h-\[calc\(100dvh-5rem\)\]/)
  assert.doesNotMatch(layout, /overflow-y-auto|[" ]h-screen/)
})
