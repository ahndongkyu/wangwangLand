"use client"

import { useRef, useState, useTransition } from "react"
import { Menu } from "@base-ui/react/menu"
import { MoreHorizontal } from "lucide-react"
import { useRouter } from "next/navigation"
import { deleteDog, updateDogStatus } from "@/features/dogs/api/mutations"
import { deleteCat, updateCatStatus } from "@/features/cats/api/mutations"
import { useConfirm } from "@/shared/components/confirm-dialog"
import { useToast } from "@/shared/components/toast"
import { cn } from "@/shared/lib/utils"
import type { DogStatus } from "@/shared/types/database"
import { ANIMAL_STATUSES, type AnimalKind } from "../lib/admin-filters"

type Props = { kind: AnimalKind; id: string; name: string }

export function AnimalStatusSelect({ kind, id, name, status }: Props & { status: DogStatus }) {
  const toast = useToast()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState("")
  return <div className="max-w-32">
    <select aria-label={`${name} 보호 상태`} value={status} disabled={pending} className={cn("min-h-11 w-full cursor-pointer rounded-lg border border-transparent px-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50", status === "보호중" ? "bg-emerald-600/10 text-emerald-800 dark:text-emerald-300" : status === "임시보호중" ? "bg-blue-600/10 text-blue-800 dark:text-blue-300" : "bg-muted text-muted-foreground")} onChange={event => {
      const next = event.target.value as DogStatus
      if (next === status) return
      setError("")
      startTransition(async () => {
        try {
          const result = await (kind === "dogs" ? updateDogStatus(id, next) : updateCatStatus(id, next))
          if (result.error) { setError(result.error); toast.error(result.error); return }
          toast.success(`${name}의 상태를 ${next}(으)로 변경했습니다.`)
          router.refresh()
        } catch { const message = "상태 변경 결과를 확인하지 못했습니다. 다시 확인해 주세요."; setError(message); toast.error(message) }
      })
    }}>{ANIMAL_STATUSES.map(value => <option key={value} value={value} className="bg-card text-foreground">{value}</option>)}</select>
    {error && <p role="alert" className="mt-1 break-words text-xs text-destructive">{error}</p>}
  </div>
}

export function AnimalRowMenu({ kind, id, name }: Props) {
  const confirm = useConfirm()
  const toast = useToast()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const locked = useRef(false)
  async function remove() {
    if (locked.current) return
    locked.current = true
    const answer = await confirm({ variant: "destructive", title: `${name} 정보를 삭제할까요?`, description: "삭제한 아이 정보는 되돌릴 수 없습니다.", confirmText: "삭제" })
    if (!answer) { locked.current = false; return }
    startTransition(async () => {
      try {
        const result = await (kind === "dogs" ? deleteDog(id) : deleteCat(id))
        if (result.error) toast.error(result.error)
        else { toast.success(`${name} 정보를 삭제했습니다.`); router.refresh() }
      } catch { toast.error("삭제 결과를 확인하지 못했습니다. 목록을 확인해 주세요.") }
      finally { locked.current = false }
    })
  }
  return <Menu.Root>
    <Menu.Trigger disabled={pending} aria-label={`${name} 추가 작업`} className="inline-flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"><MoreHorizontal className="size-4" aria-hidden /></Menu.Trigger>
    <Menu.Portal><Menu.Positioner sideOffset={6} align="end" className="z-50"><Menu.Popup className="min-w-36 rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg"><Menu.Item onClick={remove} className="flex min-h-11 cursor-pointer items-center rounded-lg px-4 text-sm text-destructive outline-none data-highlighted:bg-destructive/10">아이 정보 삭제</Menu.Item></Menu.Popup></Menu.Positioner></Menu.Portal>
  </Menu.Root>
}
