import Link from "next/link"
import { notFound } from "next/navigation"

import { getNotice, NoticeForm, NoticeDeleteButton } from "@/features/notices"

export const dynamic = "force-dynamic"

export default async function AdminNoticeEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const notice = await getNotice(id, { includeDrafts: true })

  if (!notice) notFound()

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/admin/notices" className="hover:text-foreground">
          ← 공지 목록
        </Link>
      </nav>
      <header className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          공지 수정
        </h1>
        <NoticeDeleteButton id={id} title={notice.title} redirectTo="/admin/notices" />
      </header>
      <NoticeForm notice={notice} />
    </div>
  )
}
