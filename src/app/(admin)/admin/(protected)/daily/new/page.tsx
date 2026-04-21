import Link from "next/link"

import { DailyForm } from "@/features/daily"

export default function AdminDailyNewPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/admin/daily" className="hover:text-foreground">
          ← 일상 목록
        </Link>
      </nav>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          새 일상 작성
        </h1>
      </header>
      <DailyForm />
    </div>
  )
}
