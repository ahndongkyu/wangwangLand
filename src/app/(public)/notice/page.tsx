import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "공지사항",
}

export default function NoticePage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 md:px-6 md:py-16">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-foreground md:text-4xl">
          공지사항
        </h1>
      </header>
      <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
        아직 등록된 공지가 없어요.
      </div>
    </div>
  )
}
