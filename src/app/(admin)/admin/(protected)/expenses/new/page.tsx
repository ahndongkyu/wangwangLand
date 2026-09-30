import Link from "next/link"

import { NoticeForm } from "@/features/notices"

export default function AdminExpenseNewPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/admin/expenses" className="hover:text-foreground">← 지출 내역 목록</Link>
      </nav>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">새 지출 내역 작성</h1>
      </header>
      <NoticeForm boardType="expense" cancelHref="/admin/expenses" />
    </div>
  )
}
