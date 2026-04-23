import { listRecentPublishedNotices } from "@/features/notices"
import { getCurrentProfile } from "@/features/members"
import { Footer } from "@/shared/components/layout/footer"
import { Header } from "@/shared/components/layout/header"
import { MobileCtaBar } from "@/shared/components/mobile-cta-bar"
import { ScrollButtons } from "@/shared/components/scroll-buttons"

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [recentNotices, profile] = await Promise.all([
    listRecentPublishedNotices(20),
    getCurrentProfile(),
  ])

  return (
    <div className="flex min-h-screen flex-col">
      <Header recentNotices={recentNotices} profile={profile} />
      {/* 모바일 하단 CTA 바와 겹치지 않도록 main 하단에 padding */}
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <Footer />
      <ScrollButtons />
      <MobileCtaBar />
    </div>
  )
}
