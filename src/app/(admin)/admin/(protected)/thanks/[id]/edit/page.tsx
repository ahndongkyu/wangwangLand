import Link from "next/link"
import { notFound } from "next/navigation"

import { getDonationThanks, ThanksDeleteButton, ThanksForm } from "@/features/thanks"

export const dynamic = "force-dynamic"

export default async function EditThanksPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const post = await getDonationThanks(id)
  if (!post) notFound()

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6">
      <nav className="mb-4 flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <Link href="/admin/community?category=%ED%9B%84%EC%9B%90" className="hover:text-foreground">
          ← 후원 이야기 관리
        </Link>
        <ThanksDeleteButton id={post.id} />
      </nav>
      <h1 className="mb-6 text-2xl font-bold text-foreground md:text-3xl">
        감사글 수정
      </h1>
      <ThanksForm post={post} />
    </div>
  )
}
