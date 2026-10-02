import { redirect } from "next/navigation"
import type { Metadata } from "next"
import Link from "next/link"
import { DailyForm } from "@/features/daily"
import { getCurrentProfile } from "@/features/members"
import { communityType } from "@/features/daily/lib/community-category"

export const metadata: Metadata = { title: "왕왕랜드 이야기 작성" }
export const dynamic = "force-dynamic"

export default async function DailyNewPage({ searchParams }: {
  searchParams: Promise<{ application?: string; category?: string }>
}) {
  const profile = await getCurrentProfile()
  if (!profile) redirect("/login")
  if (profile.status !== "approved" || profile.is_banned) redirect("/")
  const params = await searchParams
  const category = params.application ? "후기" : communityType(params.category)
  const listHref = `/daily?category=${encodeURIComponent(category)}`
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 md:px-6 md:py-16">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href={listHref} className="hover:text-foreground">← {category} 목록</Link>
      </nav>
      <header className="mb-6">
        <h1 className="text-2xl font-bold md:text-3xl">{category} 글쓰기</h1>
        {params.application && <p className="mt-2 text-sm text-muted-foreground">봉사 인증 기능은 종료되었습니다. 후기는 자유롭게 남겨주세요.</p>}
      </header>
      <DailyForm cancelHref={listHref} returnTo="/daily" defaultCategory={category} />
    </div>
  )
}
