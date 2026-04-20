import Image from "next/image"
import Link from "next/link"

import { DogDeleteButton, listDogs } from "@/features/dogs"
import { Badge } from "@/shared/components/ui/badge"
import { buttonVariants } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"

export const dynamic = "force-dynamic"

export default async function AdminDogsPage() {
  const dogs = await listDogs({ status: "전체", limit: 100 })

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">
            유기견 관리
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            전체 {dogs.length}마리
          </p>
        </div>
        <Link href="/admin/dogs/new" className={cn(buttonVariants())}>
          + 새 아이 등록
        </Link>
      </header>

      {dogs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          아직 등록된 아이가 없습니다. 위 버튼을 눌러 첫 아이를 등록해 보세요.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full">
            <thead className="border-b border-border bg-secondary/40 text-left text-sm">
              <tr>
                <th className="px-4 py-3 font-semibold">사진</th>
                <th className="px-4 py-3 font-semibold">이름</th>
                <th className="hidden px-4 py-3 font-semibold md:table-cell">품종</th>
                <th className="px-4 py-3 font-semibold">상태</th>
                <th className="hidden px-4 py-3 font-semibold md:table-cell">
                  등록일
                </th>
                <th className="px-4 py-3 text-right font-semibold">작업</th>
              </tr>
            </thead>
            <tbody>
              {dogs.map((dog) => {
                const thumb = dog.images[dog.thumbnail_index] ?? dog.images[0]
                return (
                  <tr
                    key={dog.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-4 py-3">
                      <div className="relative size-12 overflow-hidden rounded-md bg-muted">
                        {thumb ? (
                          <Image
                            src={thumb}
                            alt={dog.name}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-lg">
                            🐾
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium">{dog.name}</td>
                    <td className="hidden px-4 py-3 text-sm text-muted-foreground md:table-cell">
                      {dog.breed ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{dog.status}</Badge>
                    </td>
                    <td className="hidden px-4 py-3 text-sm text-muted-foreground md:table-cell">
                      {new Date(dog.created_at).toLocaleDateString("ko-KR")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Link
                          href={`/admin/dogs/${dog.id}/edit`}
                          className={cn(
                            buttonVariants({ variant: "ghost", size: "sm" })
                          )}
                        >
                          수정
                        </Link>
                        <DogDeleteButton id={dog.id} name={dog.name} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
