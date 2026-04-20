import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "입양 후기",
  description: "새 가족을 만나 행복해진 아이들의 이야기를 만나보세요.",
}

export default function StoriesPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-foreground md:text-4xl">
          입양 후기
        </h1>
        <p className="mt-3 text-muted-foreground">
          새로운 가족과 만나 따뜻한 사랑을 받고 있는 아이들의 이야기입니다.
        </p>
      </header>
      <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
        아직 등록된 후기가 없어요. 첫 번째 행복한 이야기를 준비 중입니다 💕
      </div>
    </div>
  )
}
