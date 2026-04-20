import Link from "next/link"

import { DogForm } from "@/features/dogs"

export default function AdminDogNewPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/admin/dogs" className="hover:text-foreground">
          ← 유기견 목록
        </Link>
      </nav>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          새 아이 등록
        </h1>
      </header>
      <DogForm />
    </div>
  )
}
