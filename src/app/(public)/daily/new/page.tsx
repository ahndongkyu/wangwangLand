import { redirect } from "next/navigation"
import type { Metadata } from "next"
import Link from "next/link"

import { DailyForm } from "@/features/daily"
import { getCurrentProfile } from "@/features/members"

export const metadata: Metadata = { title: "일상 작성" }
export const dynamic = "force-dynamic"

export default async function DailyNewPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect("/login")
  if (profile.status !== "approved" || profile.is_banned) redirect("/")

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 md:px-6 md:py-16">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/daily" className="hover:text-foreground">
          ← 일상 목록
        </Link>
      </nav>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">일상 작성</h1>
      </header>
      <DailyForm cancelHref="/daily" returnTo="/daily" />
    </div>
  )
}
