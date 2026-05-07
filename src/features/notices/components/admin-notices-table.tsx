"use client"

import { useState, useTransition } from "react"
import Image from "next/image"
import { Pin } from "lucide-react"

import { AdminPostActions } from "@/shared/components/admin-post-actions"
import { NoticeTypeBadge, stripNoticePrefix } from "./notice-type-badge"
import type { NoticeWithAuthor } from "../api/queries"

interface Props {
  notices: NoticeWithAuthor[]
  deleteAction: (id: string) => Promise<{ error?: string }>
  bulkDeleteAction: (ids: string[]) => Promise<{ error?: string }>
}

export function AdminNoticesTable({ notices, deleteAction, bulkDeleteAction }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkDeleting, startBulkDelete] = useTransition()

  const allIds = notices.map((n) => n.id)
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id))
  const someSelected = selected.size > 0

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(allIds))
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleBulkDelete() {
    if (!window.confirm(`${selected.size}개 항목을 삭제할까요?`)) return
    startBulkDelete(async () => {
      const result = await bulkDeleteAction(Array.from(selected))
      if (result?.error) {
        alert(result.error)
        return
      }
      window.location.reload()
    })
  }

  return (
    <div>
      {someSelected && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 flex items-center gap-3 mb-3">
          <span className="text-sm font-semibold text-primary">{selected.size}개 선택됨</span>
          <button
            type="button"
            onClick={handleBulkDelete}
            disabled={bulkDeleting}
            className="rounded-md bg-destructive px-3 py-1 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
          >
            {bulkDeleting ? "삭제 중..." : "삭제"}
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="ml-auto text-xs text-muted-foreground hover:underline"
          >
            선택 해제
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <th className="w-10 px-3 py-3 text-center">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="size-4 rounded border-border accent-primary"
                  aria-label="전체 선택"
                />
              </th>
              <th className="px-3 py-3 text-left">카테고리</th>
              <th className="w-8 px-2 py-3 text-center">핀</th>
              <th className="px-3 py-3 text-left">제목</th>
              <th className="px-3 py-3 text-left">상태</th>
              <th className="hidden sm:table-cell px-3 py-3 text-left">작성자</th>
              <th className="px-3 py-3 text-left">작성일</th>
              <th className="hidden sm:table-cell px-3 py-3 text-right">조회</th>
              <th className="w-10 px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {notices.map((n) => {
              const isSelected = selected.has(n.id)
              return (
                <tr
                  key={n.id}
                  className={`border-b border-border last:border-0 transition-colors ${
                    isSelected ? "bg-primary/5" : "hover:bg-secondary/20"
                  }`}
                >
                  <td className="px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOne(n.id)}
                      className="size-4 rounded border-border accent-primary"
                      aria-label={`선택: ${stripNoticePrefix(n.title)}`}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <NoticeTypeBadge title={n.title} />
                  </td>
                  <td className="px-2 py-3 text-center">
                    {n.is_pinned && (
                      <Pin className="inline size-3.5 text-amber-500" />
                    )}
                  </td>
                  <td className="px-3 py-3 max-w-xs">
                    <a
                      href={`/admin/notices/${n.id}/edit`}
                      className="line-clamp-1 font-medium text-foreground hover:underline"
                    >
                      {stripNoticePrefix(n.title)}
                    </a>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {n.published_at ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="inline-block size-2 rounded-full bg-green-500" />
                        <span className="text-xs text-green-700 dark:text-green-400">공개</span>
                      </span>
                    ) : (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        임시저장
                      </span>
                    )}
                  </td>
                  <td className="hidden sm:table-cell px-3 py-3 text-muted-foreground whitespace-nowrap">
                    {n.author?.nickname ?? "—"}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground whitespace-nowrap text-xs">
                    {new Date(n.created_at).toLocaleDateString("ko-KR")}
                  </td>
                  <td className="hidden sm:table-cell px-3 py-3 text-right text-muted-foreground text-xs">
                    {n.view_count.toLocaleString()}
                  </td>
                  <td className="px-3 py-3">
                    <AdminPostActions
                      editHref={`/admin/notices/${n.id}/edit`}
                      deleteAction={() => deleteAction(n.id)}
                      label="공지"
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
