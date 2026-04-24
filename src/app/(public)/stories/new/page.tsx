import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { getCurrentProfile } from "@/features/members"
import { StoryNewForm } from "./story-new-form"

export const metadata: Metadata = { title: "입양 후기 작성" }

export default async function StoryNewPage() {
  const profile = await getCurrentProfile()
  if (!profile || profile.status !== "approved" || profile.is_banned) {
    redirect("/login")
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 md:px-6 md:py-16">
      <h1 className="mb-2 text-2xl font-bold text-foreground">입양 후기 작성</h1>
      <p className="mb-8 text-sm text-muted-foreground">왕왕랜드에서 입양한 아이와의 행복한 이야기를 들려주세요 💕</p>
      <StoryNewForm />
    </div>
  )
}
