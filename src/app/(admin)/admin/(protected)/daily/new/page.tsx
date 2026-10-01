import Link from "next/link"

import { DailyForm } from "@/features/daily"

export default function AdminDailyNewPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/admin/community" className="hover:text-foreground">
          ← 왕왕랜드 이야기 관리
        </Link>
      </nav>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          새 이야기 작성
        </h1>
      </header>
      <DailyForm cancelHref="/admin/community" returnTo="/admin/community" />
    </div>
  )
}
