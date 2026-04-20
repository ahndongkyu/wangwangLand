import { DogCard } from "./dog-card"
import type { Dog } from "@/shared/types/database"

export function DogGrid({
  dogs,
  emptyMessage = "아직 등록된 아이가 없어요.",
}: {
  dogs: Dog[]
  emptyMessage?: string
}) {
  if (dogs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {dogs.map((dog) => (
        <DogCard key={dog.id} dog={dog} />
      ))}
    </div>
  )
}
