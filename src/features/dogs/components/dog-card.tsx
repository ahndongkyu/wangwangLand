import Image from "next/image"
import Link from "next/link"
import { Mars, Venus } from "lucide-react"

import { Badge } from "@/shared/components/ui/badge"
import { Card, CardContent } from "@/shared/components/ui/card"
import { formatAge } from "@/shared/lib/age"
import { cn } from "@/shared/lib/utils"
import type { Dog } from "@/shared/types/database"

function statusVariant(status: Dog["status"]) {
  switch (status) {
    case "보호중":
      // 따뜻한 민트 — primary(코랄)와 보색 대비, 살아있음·청신함 강조
      return "bg-[#7BBF8F] text-white"
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
      <Card className="overflow-hidden transition-all duration-200 group-hover:-translate-y-1 group-hover:border-[#E89B5E] group-hover:shadow-lg">
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
        <CardContent className="h-[108px] overflow-hidden p-4">
          {/* 이름 */}
          <h3 className="truncate text-lg font-bold leading-tight text-foreground">
            {dog.name}
          </h3>
          {/* 품종 */}
          {dog.breed && (
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {dog.breed}
            </p>
          )}
          {/* 메타 뱃지 그룹 */}
          <div className="mt-3 flex flex-nowrap items-center gap-1.5 overflow-hidden">
            {dog.gender && dog.gender !== "미상" && (
              <span
                className={cn(
                  "inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-[#E8D5B7] bg-[#FAF3E8] dark:border-white/10 dark:bg-white/5",
                  dog.gender === "수컷" ? "text-sky-600" : "text-pink-500"
                )}
                aria-label={dog.gender}
              >
                {dog.gender === "수컷" ? (
                  <Mars className="size-3.5" aria-hidden />
                ) : (
                  <Venus className="size-3.5" aria-hidden />
                )}
              </span>
            )}
            {formatAge(dog) && (
              <span className="inline-flex items-center rounded-full border border-[#E8D5B7] bg-[#FAF3E8] dark:border-white/10 dark:bg-white/5 px-2.5 py-0.5 text-xs font-medium text-foreground">
                {formatAge(dog)}
              </span>
            )}
            {dog.size && (
              <span className="inline-flex items-center rounded-full border border-[#E8D5B7] bg-[#FAF3E8] dark:border-white/10 dark:bg-white/5 px-2.5 py-0.5 text-xs font-medium text-foreground">
                {dog.size}형
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
