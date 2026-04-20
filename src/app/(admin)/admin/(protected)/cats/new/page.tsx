import Link from "next/link"

import { CatForm } from "@/features/cats"

export default function AdminCatNewPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/admin/cats" className="hover:text-foreground">
          ← 고양이 목록
        </Link>
      </nav>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          새 아이 등록 (고양이)
        </h1>
      </header>
      <CatForm />
    </div>
  )
}
