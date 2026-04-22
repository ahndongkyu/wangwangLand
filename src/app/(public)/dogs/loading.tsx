import { CardGridSkeleton, Skeleton } from "@/shared/components/skeleton"

export default function DogsLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <header className="mb-8 space-y-3">
        <Skeleton className="h-10 w-60" />
        <Skeleton className="h-4 w-80" />
      </header>
      <div className="mb-8 space-y-3">
        <Skeleton className="h-9 w-full max-w-md" />
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-7 w-5/6" />
        <Skeleton className="h-7 w-1/2" />
      </div>
      <CardGridSkeleton count={12} />
    </div>
  )
}
