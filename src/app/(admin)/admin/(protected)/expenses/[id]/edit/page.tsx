import Link from "next/link"
import { notFound } from "next/navigation"

import { getNotice, NoticeDeleteButton, NoticeForm } from "@/features/notices"

export const dynamic = "force-dynamic"

export default async function AdminExpenseEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const expense = await getNotice(id, { includeDrafts: true, boardType: "expense" })
  if (!expense) notFound()

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/admin/expenses" className="hover:text-foreground">← 지출 내역 목록</Link>
      </nav>
      <header className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">지출 내역 수정</h1>
        <NoticeDeleteButton id={id} title={expense.title} redirectTo="/admin/expenses" boardType="expense" />
      </header>
      <NoticeForm notice={expense} boardType="expense" cancelHref="/admin/expenses" />
    </div>
  )
}
