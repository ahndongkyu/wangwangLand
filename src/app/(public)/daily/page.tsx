import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "왕왕랜드 일상",
  description: "보호 중인 아이들의 평화로운 하루를 기록합니다.",
}

export default function DailyPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-foreground md:text-4xl">
          왕왕랜드 일상
        </h1>
        <p className="mt-3 text-muted-foreground">
          보호 중인 아이들과 함께하는 하루하루를 담았습니다.
        </p>
      </header>
      <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
        아직 등록된 일상 사진이 없어요. 곧 따뜻한 순간들을 공유할게요 📷
      </div>
    </div>
  )
}
