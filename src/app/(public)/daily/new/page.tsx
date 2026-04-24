import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { getCurrentProfile } from "@/features/members"
import { DailyNewForm } from "./daily-new-form"

export const metadata: Metadata = { title: "일상 작성" }

export default async function DailyNewPage() {
  const profile = await getCurrentProfile()
  if (!profile || profile.status !== "approved" || profile.is_banned) {
    redirect("/login")
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 md:px-6 md:py-16">
      <h1 className="mb-8 text-2xl font-bold text-foreground">일상 작성</h1>
      <DailyNewForm />
    </div>
  )
}
