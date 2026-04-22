import { CardGridSkeleton, Skeleton } from "@/shared/components/skeleton"

export default function StoriesLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <header className="mb-8 space-y-3">
        <Skeleton className="h-10 w-60" />
        <Skeleton className="h-4 w-96" />
      </header>
      <Skeleton className="mb-8 h-9 w-full max-w-md" />
      <CardGridSkeleton count={9} />
    </div>
  )
}
