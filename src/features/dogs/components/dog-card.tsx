import Image from "next/image"
import Link from "next/link"
import { formatAge } from "@/shared/lib/age"
import { SITE } from "@/shared/constants/site"
import type { Dog } from "@/shared/types/database"

export function DogCard({ dog, variant = "list" }: { dog: Dog; variant?: "list" | "home" }) {
  const thumbnail = dog.images[dog.thumbnail_index] ?? dog.images[0]
  const facts = [formatAge(dog), dog.gender !== "미상" ? dog.gender : null, dog.size ? `${dog.size}형` : null].filter(Boolean)
  return (
    <Link href={`/dogs/${dog.id}`} className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {thumbnail ? <Image src={thumbnail} alt={dog.name} fill sizes="(max-width: 767px) 50vw, 360px" className="object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transform-none" /> : <span className="absolute inset-0 flex items-center justify-center" aria-hidden><span className="aspect-[1.53/1] w-[42%] bg-left bg-no-repeat opacity-30 grayscale dark:invert" style={{ backgroundImage: `url(${SITE.headerLogo})`, backgroundSize: "196.08% 100%" }} /></span>}
        <span className="absolute left-3 top-3 rounded-full border border-border/50 bg-card/95 px-2.5 py-1 text-xs font-medium text-foreground">{dog.status}</span>
      </div>
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <h3 className="break-words text-base font-bold tracking-tight text-foreground group-hover:text-primary sm:text-xl">{dog.name}</h3>
        {variant === "list" && dog.breed && <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground sm:text-sm">{dog.breed}</p>}
        {variant === "home" ? (
          <p className="mt-2 truncate text-xs text-muted-foreground" title={facts.join(" · ")}>{facts.join(" · ")}</p>
        ) : (
          <p className="mt-auto flex flex-wrap gap-x-2 gap-y-1 pt-3 text-xs text-muted-foreground sm:text-sm">{facts.map((fact, i) => <span key={i}>{i > 0 && <span className="mr-2 text-border" aria-hidden>·</span>}{fact}</span>)}</p>
        )}
      </div>
    </Link>
  )
}
