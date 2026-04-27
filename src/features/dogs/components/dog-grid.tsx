import { DogCard } from "./dog-card"
import type { Dog } from "@/shared/types/database"

export function DogGrid({
  dogs,
  emptyMessage = "아직 등록된 아이가 없어요.",
  mobileLimit,
}: {
  dogs: Dog[]
  emptyMessage?: string
  /** 모바일에서 보여줄 최대 카드 수 (초과분은 md: 이상에서만 표시) */
  mobileLimit?: number
}) {
  if (dogs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {dogs.map((dog, i) => (
        <div
          key={dog.id}
          className={
            mobileLimit !== undefined && i >= mobileLimit
              ? "hidden md:block"
              : undefined
          }
        >
          <DogCard dog={dog} />
        </div>
      ))}
    </div>
  )
}
