import { CatCard } from "./cat-card"
import type { Cat } from "@/shared/types/database"

export function CatGrid({
  cats,
  emptyMessage = "아직 등록된 아이가 없어요.",
}: {
  cats: Cat[]
  emptyMessage?: string
}) {
  if (cats.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {cats.map((cat) => (
        <CatCard key={cat.id} cat={cat} />
      ))}
    </div>
  )
}
