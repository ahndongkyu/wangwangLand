import Image from "next/image"
import Link from "next/link"

import { Badge } from "@/shared/components/ui/badge"
import { Card, CardContent } from "@/shared/components/ui/card"
import { cn } from "@/shared/lib/utils"
import type { Cat } from "@/shared/types/database"

function formatAge(months: number | null) {
  if (months == null) return "나이 미상"
  if (months < 12) return `${months}개월`
  const years = Math.floor(months / 12)
  const remainingMonths = months % 12
  if (remainingMonths === 0) return `${years}살`
  return `${years}살 ${remainingMonths}개월`
}

function statusVariant(status: Cat["status"]) {
  switch (status) {
    case "보호중":
      return "bg-primary/15 text-primary"
    case "임시보호중":
      return "bg-accent/30 text-accent-foreground"
    case "입양완료":
      return "bg-muted text-muted-foreground"
    case "무지개다리":
      return "bg-foreground/10 text-foreground/70"
  }
}

export function CatCard({ cat }: { cat: Cat }) {
  const thumbnailSrc = cat.images[cat.thumbnail_index] ?? cat.images[0] ?? null

  return (
    <Link href={`/cats/${cat.id}`} className="group block">
      <Card className="overflow-hidden transition-shadow group-hover:shadow-md">
        <div className="relative aspect-square w-full overflow-hidden bg-muted">
          {thumbnailSrc ? (
            <Image
              src={thumbnailSrc}
              alt={cat.name}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-4xl">
              🐱
            </div>
          )}
          <Badge
            className={cn(
              "absolute left-3 top-3 border-0 px-2 py-0.5 text-xs font-semibold",
              statusVariant(cat.status)
            )}
          >
            {cat.status}
          </Badge>
        </div>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-foreground">
              {cat.name}
            </h3>
            {cat.gender && cat.gender !== "미상" && (
              <span className="text-xs text-muted-foreground">
                {cat.gender === "수컷" ? "♂" : "♀"} {cat.gender}
              </span>
            )}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {[cat.breed, formatAge(cat.age_months)].filter(Boolean).join(" · ")}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
