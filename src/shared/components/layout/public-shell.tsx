"use client"

import { usePathname } from "next/navigation"
import type { ReactNode } from "react"

import { cn } from "@/shared/lib/utils"

const FOCUSED_ROUTES = [
  "/agreement",
  "/login",
  "/onboarding",
  "/pending",
  "/privacy",
  "/profile",
  "/rejected",
  "/terms",
]

function isFocusedRoute(pathname: string): boolean {
  return FOCUSED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
}

export function PublicShell({
  children,
  sidebar,
}: {
  children: ReactNode
  sidebar: ReactNode
}) {
  const pathname = usePathname()
  const focused = isFocusedRoute(pathname)

  return (
    <main
      data-public-scope
      className="flex-1 bg-background"
    >
      {focused ? (
        <div className="min-h-full">{children}</div>
      ) : (
        <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8 2xl:px-12">
          <div className="grid min-w-0 gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-9">
            {sidebar}
            <section
              className={cn(
                "min-w-0",
                pathname !== "/" && "rounded-2xl border border-border bg-card"
              )}
            >
              {children}
            </section>
          </div>
        </div>
      )}
    </main>
  )
}
