"use client"

import { AdminContentList } from "@/shared/components/admin-content-list"
import { communityType } from "../lib/community-category"
import type { DailyPostWithAuthor } from "../api/queries"

interface Props {
  posts: DailyPostWithAuthor[]
  deleteAction: (id: string) => Promise<{ error?: string }>
  bulkDeleteAction: (ids: string[]) => Promise<{ error?: string }>
}

export function AdminDailyTable({ posts, deleteAction }: Props) {
  return <AdminContentList deleteAction={deleteAction} rows={posts.map(post => ({
    id: post.id, title: post.title, href: `/admin/daily/${post.id}/edit`, category: communityType(post.category),
    author: post.author?.nickname ?? "—", date: post.posted_at, status: "공개", views: post.view_count,
  }))} />
}
