"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/shared/components/toast"

type SaveResult = { error?: string | null; warning?: string; redirectTo?: string }

/** 서버 저장 결과를 확인한 뒤에만 완료 처리하고 화면을 전환합니다. */
export function useSaveFeedback(onError: (message: string | null) => void) {
  const router = useRouter()
  const toast = useToast()
  const running = useRef(false)
  const [pending, setPending] = useState(false)
  const [completed, setCompleted] = useState(false)

  async function save(action: () => Promise<SaveResult>, message: string, href?: string, onSuccess?: () => void) {
    if (running.current) return
    running.current = true
    setPending(true)
    onError(null)
    let result: SaveResult
    try { result = await action() }
    catch {
      const error = "저장 결과를 확인하지 못했습니다. 목록을 먼저 확인한 뒤 다시 시도해 주세요."
      onError(error); toast.error(error)
      running.current = false; setPending(false)
      return
    }
    if (!result || result.error) {
      const error = result?.error || "저장 완료 여부를 확인하지 못했습니다. 다시 확인해 주세요."
      onError(error); toast.error(error)
      running.current = false; setPending(false)
      return
    }
    onSuccess?.()
    setCompleted(true)
    if (result.warning) toast.warning(`${message} ${result.warning}`, { duration: 10000 })
    else toast.success(message)
    const destination = href ?? result.redirectTo
    if (destination) router.replace(destination)
    router.refresh()
  }

  return { save, pending, completed }
}
