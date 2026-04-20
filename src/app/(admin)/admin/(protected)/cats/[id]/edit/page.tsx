import Link from "next/link"
import { notFound } from "next/navigation"

import { CatForm, getCat } from "@/features/cats"

export const dynamic = "force-dynamic"

export default async function AdminCatEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const cat = await getCat(id)

  if (!cat) notFound()

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/admin/cats" className="hover:text-foreground">
          ← 고양이 목록
        </Link>
      </nav>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          {cat.name} 수정
        </h1>
      </header>
      <CatForm cat={cat} />
    </div>
  )
}
