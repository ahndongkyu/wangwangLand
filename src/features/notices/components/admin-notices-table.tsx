"use client"

import { AdminContentList } from "@/shared/components/admin-content-list"
import { parseNoticePrefix, stripNoticePrefix } from "./notice-type-badge"
import type { NoticeWithAuthor } from "../api/queries"
import type { NoticeBoardType } from "@/shared/types/database"

interface Props {
  notices: NoticeWithAuthor[]
  deleteAction: (id: string) => Promise<{ error?: string }>
  bulkDeleteAction: (ids: string[]) => Promise<{ error?: string }>
  boardType?: NoticeBoardType
}

export function AdminNoticesTable({ notices, deleteAction, boardType = "notice" }: Props) {
  const expense = boardType === "expense"
  return <AdminContentList deleteAction={deleteAction} rows={notices.map(post => ({
    id: post.id, title: expense ? post.title : stripNoticePrefix(post.title),
    href: `/admin/${expense ? "expenses" : "notices"}/${post.id}/edit`,
    category: expense ? "지출" : parseNoticePrefix(post.title) ?? "공지",
    author: post.author?.nickname ?? "—", date: post.created_at, views: post.view_count,
    status: expense ? (post.home_visible ? "홈 공개" : "비공개") : post.published_at ? "공개" : "임시저장",
    detail: [post.is_pinned ? "상단 고정" : "", post.attachments?.length ? `첨부 ${post.attachments.length}개` : ""].filter(Boolean).join(" · "),
  }))} />
}
