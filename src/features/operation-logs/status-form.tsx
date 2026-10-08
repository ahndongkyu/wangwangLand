"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/shared/components/toast"
import { updateLogStatus } from "./actions"
import { logStatuses, type OperationLog, type LogStatus } from "./catalog"

export function LogStatusForm({ log }: { log: OperationLog }) {
  const [status, setStatus] = useState<LogStatus>(log.status)
  const [pending, startTransition] = useTransition()
  const toast = useToast()
  const router = useRouter()
  return <form className="mt-4 flex flex-wrap items-end gap-2" action={() => startTransition(async () => {
    try {
      const result = await updateLogStatus(log.id, status, log.last_seen_at)
      if (result.error) toast.error(result.error)
      else toast.success("처리 상태를 저장했습니다.")
      router.refresh()
    } catch { toast.error("저장하지 못했습니다. 다시 시도해주세요.") }
  })}>
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">처리 상태
      <select value={status} onChange={e => setStatus(e.target.value as LogStatus)} disabled={pending} className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-ring">
        {Object.entries(logStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </label>
    <button disabled={pending || status === log.status} className="min-h-11 rounded-lg bg-primary px-4 text-sm text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50">{pending ? "저장 중…" : "상태 저장"}</button>
    <p className="w-full text-xs text-muted-foreground">해결 표시는 분류만 변경합니다. 실제 기능을 자동으로 수정하지 않습니다.</p>
  </form>
}
