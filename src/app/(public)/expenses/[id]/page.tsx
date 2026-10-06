import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { Paperclip } from "lucide-react"

import { getNotice, getAdjacentNotices } from "@/features/notices"
import { getCurrentProfile } from "@/features/members"
import { CommentSection } from "@/features/comments"
import { RichTextContent } from "@/shared/components/rich-text-content"
import { ViewCounter } from "@/shared/components/view-counter"
import { PostNavigation } from "@/shared/components/post-navigation"
import { formatPostDateTime } from "@/shared/lib/utils"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "지출 내역" }

export default async function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [post, profile] = await Promise.all([getNotice(id, { boardType: "expense" }), getCurrentProfile()])
  if (!profile) return null
  if (!post) notFound()
  const adjacent = post.published_at ? await getAdjacentNotices(id, post.published_at, "expense") : { prev: null, next: null }
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 md:px-6 md:py-16">
      <ViewCounter table="notices" postId={post.id} authorId={post.created_by} currentUserId={profile.id} />
      <nav className="mb-4 text-sm text-muted-foreground"><Link href="/expenses" className="hover:text-foreground">← 지출 내역</Link></nav>
      <header className="mb-8 border-b border-border pb-6">
        <p className="mb-2 text-xs text-muted-foreground">{post.author?.nickname ?? "왕왕랜드"} · <span className="whitespace-nowrap">{formatPostDateTime(post.published_at ?? post.created_at)}</span> · 조회 {post.view_count ?? 0}</p>
        <h1 className="break-words text-2xl font-bold md:text-3xl">{post.title}</h1>
      </header>
      <article><RichTextContent html={post.content} /></article>
      {(post.attachments?.length ?? 0) > 0 && (
        <section className="mt-8 rounded-xl border border-border bg-secondary/20 p-4" aria-label="첨부파일">
          <h2 className="mb-3 text-sm font-semibold">첨부파일</h2>
          <ul className="space-y-2">{post.attachments.map((file) => (
            <li key={file.path}>
              <a href={`/api/admin/expense-attachments?path=${encodeURIComponent(file.path)}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg bg-card px-3 py-2.5 text-sm hover:text-primary">
                <Paperclip className="size-4 shrink-0" aria-hidden /><span className="min-w-0 break-all">{file.name}</span>
              </a>
            </li>
          ))}</ul>
        </section>
      )}
      <CommentSection postType="notice" postId={post.id} />
      <PostNavigation basePath="/expenses" prev={adjacent.prev} next={adjacent.next} />
    </div>
  )
}
