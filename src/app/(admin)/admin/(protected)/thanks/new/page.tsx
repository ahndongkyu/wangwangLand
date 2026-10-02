import type { Metadata } from "next"
import Link from "next/link"

import { ThanksForm } from "@/features/thanks"

export const metadata: Metadata = { title: "새 감사글" }

export default async function NewThanksPage({
  searchParams,
}: {
  searchParams: Promise<{ donationId?: string }>
}) {
  const { donationId } = await searchParams

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/admin/community?category=%ED%9B%84%EC%9B%90" className="hover:text-foreground">
          ← 후원 이야기 관리
        </Link>
      </nav>
      <h1 className="mb-6 text-2xl font-bold text-foreground md:text-3xl">
        새 감사글 작성
      </h1>
      {/* donationId 가 있으면 ThanksForm 의 hidden donation_id 에 prefill */}
      <ThanksForm post={donationId ? { donation_id: donationId } : undefined} />
    </div>
  )
}
