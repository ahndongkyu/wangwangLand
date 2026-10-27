"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { useConfirm } from "./confirm-dialog"
import { useToast } from "./toast"
import { Button } from "./ui/button"
import { ADMIN_LIST, deleteSelectedItems } from "@/shared/lib/admin-list"
import { cn, formatShortDate } from "@/shared/lib/utils"

export interface AdminContentRow {
  id: string
  title: string
  href: string
  category: string
  author: string
  date: string
  views?: number
  status: string
  detail?: string
}

export function AdminContentList({ rows, deleteAction }: {
  rows: AdminContentRow[]
  deleteAction: (id: string) => Promise<{ error?: string }>
}) {
  // Remount on page/filter results so selection never crosses a result page.
  return <ContentPage key={JSON.stringify(rows.map(row => [row.id, row.title, row.status]))} rows={rows} deleteAction={deleteAction} />
}

function ContentPage({ rows, deleteAction }: { rows: AdminContentRow[]; deleteAction: (id: string) => Promise<{ error?: string }> }) {
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [removed, setRemoved] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const lock = useRef(false)
  const confirm = useConfirm()
  const toast = useToast()
  const router = useRouter()
  const visible = rows.filter(row => !removed.has(row.id))
  const targets = visible.filter(row => selected.has(row.id))
  const allSelected = visible.length > 0 && targets.length === visible.length
  const grid = "grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 xl:grid-cols-[64px_minmax(0,1fr)_88px_92px_86px_52px]"

  function toggle(id: string) {
    if (lock.current) return
    setSelected(previous => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setError("")
  }

  async function handleDelete() {
    if (lock.current || !targets.length) return
    lock.current = true
    setBusy(true)
    try {
      const approved = await confirm({
        title: `게시물 ${targets.length}개를 삭제할까요?`,
        description: "선택한 게시물을 확인해 주세요. 삭제하면 되돌릴 수 없습니다.",
        items: targets.map(row => row.title),
        confirmText: `${targets.length}개 삭제`,
        variant: "destructive",
      })
      if (!approved) return
      const { succeeded, failed } = await deleteSelectedItems(targets.map(row => row.id), deleteAction)
      setRemoved(previous => new Set([...previous, ...succeeded]))
      setSelected(new Set(failed))
      if (succeeded.length) toast.success(`게시물 ${succeeded.length}개를 삭제했습니다.`)
      if (failed.length) {
        setError(`${failed.length}개 항목을 삭제하지 못했습니다. 선택된 항목을 확인하고 다시 시도해 주세요.`)
        toast.error("일부 항목을 삭제하지 못했습니다.")
      } else {
        setSelecting(false)
        setError("")
        router.refresh()
      }
    } catch {
      setError("삭제 결과를 확인하지 못했습니다. 선택한 항목을 유지했습니다. 연결 상태를 확인해 주세요.")
      toast.error("삭제 결과를 확인하지 못했습니다.")
    } finally { lock.current = false; setBusy(false) }
  }

  const controls = selecting && <div className="sticky bottom-[calc(104px+env(safe-area-inset-bottom))] z-30 mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-3 shadow-sm md:bottom-3 xl:static xl:order-first xl:mb-3 xl:mt-0" aria-label="선택 작업">
    <label className="flex min-h-11 items-center gap-2 px-1 text-sm">
      <input type="checkbox" checked={allSelected} ref={node => { if (node) node.indeterminate = targets.length > 0 && !allSelected }} disabled={busy || !visible.length} onChange={() => setSelected(allSelected ? new Set() : new Set(visible.map(row => row.id)))} className="size-4 accent-primary" />
      현재 페이지 <span aria-live="polite">{targets.length}개 선택</span>
    </label>
    <Button variant="destructive" disabled={busy || !targets.length} onClick={handleDelete} className="min-h-11">{busy ? "처리 중…" : "선택 삭제"}</Button>
  </div>

  return <section aria-label="게시물 목록" aria-busy={busy}>
    <div className="mb-3 flex items-center justify-between gap-3">
      <p className="text-xs text-muted-foreground">{selecting ? "선택 모드 · 항목을 눌러 선택하세요." : "글을 누르면 관리 화면으로 이동합니다."}</p>
      <Button variant="outline" disabled={busy} onClick={() => { setSelecting(!selecting); setSelected(new Set()); setError("") }} className="min-h-11 shrink-0">{selecting ? "선택 취소" : "선택"}</Button>
    </div>
    {error && <p role="alert" className="mb-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
    <div className="flex flex-col">
      <div className={ADMIN_LIST.surface}>
        <div aria-hidden className={cn(grid, ADMIN_LIST.header, "hidden xl:grid")}><span>{selecting ? "선택" : "유형"}</span><span>제목</span><span className="text-center">상태</span><span className="text-center">작성자</span><span className="text-center">작성일</span><span className="text-right">조회</span></div>
        <ul className="divide-y divide-border">{visible.map(row => {
          const content = <>
            <span className="col-start-2 col-end-4 row-start-1 min-w-0 xl:col-end-3"><span className="block truncate font-medium" title={row.title}>{row.title}</span>{row.detail && <span className="block truncate text-xs text-muted-foreground" title={row.detail}>{row.detail}</span>}</span>
            <span className="col-start-1 row-start-2 whitespace-nowrap text-xs text-muted-foreground xl:col-start-3 xl:row-start-1 xl:text-center">{row.status}</span>
            <span className="col-start-2 row-start-2 truncate text-xs text-muted-foreground xl:col-start-4 xl:row-start-1 xl:text-center">{row.author}</span>
            <span className="col-start-3 row-start-2 whitespace-nowrap text-xs tabular-nums text-muted-foreground xl:col-start-5 xl:row-start-1 xl:text-center">{formatShortDate(row.date)}</span>
            <span className="col-start-3 row-start-3 text-right text-xs tabular-nums text-muted-foreground xl:col-start-6 xl:row-start-1"><span className="xl:hidden">조회 </span>{row.views == null ? "—" : row.views.toLocaleString()}</span>
          </>
          return <li key={row.id}>{selecting ? <label className={cn(grid, ADMIN_LIST.row, "cursor-pointer", selected.has(row.id) && "bg-primary/5", busy && "pointer-events-none opacity-60")}>
            <span className="col-start-1 row-start-1 flex min-h-11 items-center justify-center"><input type="checkbox" disabled={busy} checked={selected.has(row.id)} onChange={() => toggle(row.id)} aria-label={`${row.title} 선택`} className="size-4 accent-primary" /></span>{content}
          </label> : <Link href={row.href} className={cn(grid, ADMIN_LIST.row)}><span className="col-start-1 row-start-1 text-xs text-muted-foreground">{row.category}</span>{content}</Link>}</li>
        })}</ul>
        {!visible.length && <p className="p-8 text-center text-sm text-muted-foreground">표시할 게시물이 없습니다.</p>}
      </div>
      {controls}
    </div>
  </section>
}
