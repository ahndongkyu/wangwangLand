import Image from "next/image"
import Link from "next/link"

import { Badge } from "@/shared/components/ui/badge"
import { Card, CardContent } from "@/shared/components/ui/card"
import { cn } from "@/shared/lib/utils"
import type { Dog } from "@/shared/types/database"

function formatAge(months: number | null) {
  if (months == null) return "나이 미상"
  if (months < 12) return `${months}개월`
  const years = Math.floor(months / 12)
  const remainingMonths = months % 12
  if (remainingMonths === 0) return `${years}살`
  return `${years}살 ${remainingMonths}개월`
}

function statusVariant(status: Dog["status"]) {
  switch (status) {
    case "보호중":
      return "bg-primary text-primary-foreground"
    case "임시보호중":
      return "bg-[#4B7A42] text-white"
    case "입양완료":
      return "bg-foreground/80 text-background"
    case "무지개다리":
      return "bg-muted-foreground text-background"
  }
}

export function DogCard({ dog }: { dog: Dog }) {
  const thumbnailSrc = dog.images[dog.thumbnail_index] ?? dog.images[0] ?? null

  return (
    <Link href={`/dogs/${dog.id}`} className="group block">
      <Card className="overflow-hidden transition-shadow group-hover:shadow-md">
        <div className="relative aspect-square w-full overflow-hidden bg-muted">
          {thumbnailSrc ? (
            <Image
              src={thumbnailSrc}
              alt={dog.name}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-4xl">
              🐾
            </div>
          )}
          <Badge
            className={cn(
              "absolute left-3 top-3 border-0 px-2.5 py-1 text-xs font-bold shadow-md ring-1 ring-black/5",
              statusVariant(dog.status)
            )}
          >
            {dog.status}
          </Badge>
        </div>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-foreground">
              {dog.name}
            </h3>
            {dog.gender && dog.gender !== "미상" && (
              <span className="text-xs text-muted-foreground">
                {dog.gender === "수컷" ? "♂" : "♀"} {dog.gender}
              </span>
            )}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {[dog.breed, formatAge(dog.age_months)].filter(Boolean).join(" · ")}
          </div>
          {dog.size && (
            <div className="mt-2">
              <span className="inline-flex items-center rounded-full bg-accent/30 px-2 py-0.5 text-[11px] font-semibold text-accent-foreground">
                {dog.size}형
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
