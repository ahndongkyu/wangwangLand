import Link from "next/link"
import { notFound } from "next/navigation"

import { DogForm, getDog } from "@/features/dogs"

export const dynamic = "force-dynamic"

export default async function AdminDogEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const dog = await getDog(id)

  if (!dog) notFound()

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/admin/dogs" className="hover:text-foreground">
          ← 유기견 목록
        </Link>
      </nav>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          {dog.name} 수정
        </h1>
      </header>
      <DogForm dog={dog} />
    </div>
  )
}
