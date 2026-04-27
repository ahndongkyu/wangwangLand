import Link from "next/link"
import { notFound } from "next/navigation"

import { DailyForm, DailyDeleteButton, getDailyPost } from "@/features/daily"

export const dynamic = "force-dynamic"

export default async function AdminDailyEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const post = await getDailyPost(id)

  if (!post) notFound()

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/admin/daily" className="hover:text-foreground">
          ← 일상 목록
        </Link>
      </nav>
      <header className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          일상 수정
        </h1>
        <DailyDeleteButton id={id} title={post.title} redirectTo="/admin/daily" />
      </header>
      <DailyForm post={post} />
    </div>
  )
}
