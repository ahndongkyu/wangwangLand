import { listRecentPublishedNotices } from "@/features/notices"
import { Footer } from "@/shared/components/layout/footer"
import { Header } from "@/shared/components/layout/header"
import { ScrollButtons } from "@/shared/components/scroll-buttons"

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 헤더 뱃지 계산용 — 최근 발행된 공지 타임스탬프만.
  // 페이지별 revalidate(일반적으로 60초) 주기로 새로고침되며, 공지 mutation 은
  // notices/api/mutations.ts 에서 `/` 를 revalidate 하므로 즉시 반영된다.
  const recentNotices = await listRecentPublishedNotices(20)

  return (
    <div className="flex min-h-screen flex-col">
      <Header recentNotices={recentNotices} />
      <main className="flex-1">{children}</main>
      <Footer />
      <ScrollButtons />
    </div>
  )
}
