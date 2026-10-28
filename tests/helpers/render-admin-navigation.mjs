import fs from "node:fs"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { load } from "./page-review-fixtures.mjs"
const passthrough = ({ children }) => children
const { AdminSidebar } = load("src/app/(admin)/admin/(protected)/_components/admin-header.tsx", {
  "next/image": { default: () => null }, "next/link": { default: ({children,...props}) => React.createElement("a",props,children) },
  "next/navigation": { usePathname: () => "/admin/settings/delivery", useSearchParams: () => new URLSearchParams() },
  "@/shared/components/theme-toggle": { ThemeToggle: () => null },
  "@/shared/components/header-profile": { HeaderProfile: () => null },
  "@/shared/components/admin-logo": { AdminLogo: () => null },
  "@/shared/components/mobile-header-menu": { MobileHeaderMenu: passthrough },
  "@/shared/components/mobile-header-title": { MobileHeaderTitle: passthrough },
  "@/shared/components/admin-notification-bell": { AdminNotificationBell: () => null },
  "@/shared/lib/utils": { cn: (...args) => args.filter(Boolean).join(" ") },
  "@/shared/constants/site": { SITE: { name: "왕왕랜드" } },
  "@/shared/components/ui/sheet": Object.fromEntries(["Sheet","SheetClose","SheetContent","SheetHeader","SheetTitle","SheetTrigger"].map(name => [name,passthrough])),
  "@/shared/components/ui/button": { Button: passthrough },
})
const sidebar = renderToStaticMarkup(React.createElement(AdminSidebar,{adminName:"관리자",adminRole:"admin",isTopAdmin:true,pendingCounts:{total:0},logoutAction:"#"}))
const css = fs.readdirSync(".next/static/css").filter(f=>f.endsWith(".css")).map(f=>fs.readFileSync(`.next/static/css/${f}`,"utf8")).join("\n")
fs.mkdirSync("/private/tmp/admin-nav-preview",{recursive:true})
fs.writeFileSync("/private/tmp/admin-nav-preview/index.html",`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><body class="bg-background text-foreground"><div data-admin-scope><header class="h-16 border-b border-border bg-card px-8 py-5">왕왕랜드 운영 관리</header><div class="mx-auto grid max-w-[1440px] md:grid-cols-[252px_minmax(0,1fr)] md:gap-6 md:px-6 md:py-6 lg:gap-8 lg:px-8">${sidebar}<main class="min-w-0 md:col-start-2 p-6"><p class="text-muted-foreground">운영 설정</p><h1 class="mt-2 text-2xl font-bold">배송 안내</h1><section class="mt-6 rounded-xl border border-border bg-card p-6">배송 주소와 수령 정보를 관리합니다.</section><div style="height:1500px"></div></main></div></div></body></html>`)
