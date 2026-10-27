"use client"

import { AdminContentList } from "@/shared/components/admin-content-list"
import type { StoryWithDog } from "../api/queries"

interface Props {
  stories: StoryWithDog[]
  deleteAction: (id: string) => Promise<{ error?: string }>
  bulkDeleteAction: (ids: string[]) => Promise<{ error?: string }>
}

export function AdminStoriesTable({ stories, deleteAction }: Props) {
  return <AdminContentList deleteAction={deleteAction} rows={stories.map(post => ({
    id: post.id, title: post.title, href: `/admin/stories/${post.id}/edit`, category: "후기",
    author: post.author?.nickname ?? "—", date: post.created_at, status: post.published_at ? "공개" : "임시저장",
    views: post.view_count, detail: post.dog ? `입양한 아이: ${post.dog.name}` : undefined,
  }))} />
}
