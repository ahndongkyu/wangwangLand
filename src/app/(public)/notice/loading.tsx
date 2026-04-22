import { ListRowSkeleton, Skeleton } from "@/shared/components/skeleton"

export default function NoticeLoading() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 md:px-6 md:py-16">
      <header className="mb-8 space-y-3">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-4 w-72" />
      </header>
      <Skeleton className="mb-6 h-9 w-full max-w-md" />
      <ListRowSkeleton count={8} />
    </div>
  )
}
