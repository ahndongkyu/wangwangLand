import { redirect, notFound } from "next/navigation"
import type { Metadata } from "next"
import Link from "next/link"

import { DailyForm, getDailyPost } from "@/features/daily"
import { getCurrentProfile } from "@/features/members"

export const metadata: Metadata = { title: "일상 수정" }
export const dynamic = "force-dynamic"

export default async function DailyEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [post, profile] = await Promise.all([getDailyPost(id), getCurrentProfile()])

  if (!post) notFound()
  if (!profile) redirect("/login")
  if (profile.status !== "approved" || profile.is_banned) redirect("/")

  const isAuthor = post.created_by === profile.id
  const isStaff = profile.role === "staff" || profile.role === "admin"
  if (!isAuthor && !isStaff) redirect(`/daily/${id}`)

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 md:px-6 md:py-16">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href={`/daily/${id}`} className="hover:text-foreground">
          ← 글로 돌아가기
        </Link>
      </nav>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">일상 수정</h1>
      </header>
      <DailyForm post={post} cancelHref={`/daily/${id}`} returnTo={`/daily/${id}`} />
    </div>
  )
}
