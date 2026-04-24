import Image from "next/image"
import Link from "next/link"

import { RoleBadge } from "@/shared/components/role-badge"
import type { StoryWithDog } from "../api/queries"

export function StoryCard({ story }: { story: StoryWithDog }) {
  const cover = story.images[0] ?? null

  return (
    <Link
      href={`/stories/${story.id}`}
      className="group block overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {cover ? (
          <Image
            src={cover}
            alt={story.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl">
            💕
          </div>
        )}
        {story.images.length > 1 && (
          <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">
            +{story.images.length - 1}
          </span>
        )}
      </div>
      <div className="p-4">
        {story.dog && (
          <p className="text-xs font-semibold text-primary">
            🐶 {story.dog.name}
          </p>
        )}
        <h3 className="mt-1 line-clamp-2 text-base font-semibold text-foreground">
          {story.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
          {story.content}
        </p>
        <div className="mt-3 flex items-center gap-2">
          {story.author && (
            <>
              <RoleBadge role={story.author.role} />
              <span className="text-xs text-muted-foreground">{story.author.nickname}</span>
            </>
          )}
          {story.published_at && (
            <span className="ml-auto text-xs text-muted-foreground">
              {new Date(story.published_at).toLocaleDateString("ko-KR")}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
