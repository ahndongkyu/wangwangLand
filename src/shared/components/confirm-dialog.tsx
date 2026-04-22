"use client"

import { AlertDialog } from "@base-ui/react/alert-dialog"
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react"

import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"

export interface ConfirmOptions {
  title?: string
  description?: string
  /** 확인 버튼 라벨. 기본 "확인" */
  confirmLabel?: string
  /** 취소 버튼 라벨. 기본 "취소" */
  cancelLabel?: string
  /** 빨간 강조(삭제 같은 파괴적 액션) 여부 */
  danger?: boolean
}

type ConfirmFn = (opts?: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

interface Pending {
  opts: ConfirmOptions
  resolve: (ok: boolean) => void
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null)
  const resolveRef = useRef<(ok: boolean) => void>(() => {})

  const confirm = useCallback<ConfirmFn>((opts = {}) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve
      setPending({ opts, resolve })
    })
  }, [])

  function handleResult(ok: boolean) {
    pending?.resolve(ok)
    setPending(null)
  }

  const opts = pending?.opts ?? {}

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog.Root
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) handleResult(false)
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/50 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 transition-opacity duration-200" />
          <AlertDialog.Popup
            className={cn(
              "fixed left-1/2 top-1/2 z-50 w-[min(90vw,24rem)] -translate-x-1/2 -translate-y-1/2",
              "rounded-xl border border-border bg-card p-6 shadow-2xl",
              "data-[starting-style]:scale-95 data-[starting-style]:opacity-0",
              "data-[ending-style]:scale-95 data-[ending-style]:opacity-0",
              "transition-all duration-200"
            )}
          >
            {opts.title && (
              <AlertDialog.Title className="text-lg font-bold text-foreground">
                {opts.title}
              </AlertDialog.Title>
            )}
            {opts.description && (
              <AlertDialog.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {opts.description}
              </AlertDialog.Description>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <AlertDialog.Close
                render={<Button variant="outline" size="sm" />}
                onClick={() => handleResult(false)}
              >
                {opts.cancelLabel ?? "취소"}
              </AlertDialog.Close>
              <Button
                type="button"
                size="sm"
                variant={opts.danger ? "destructive" : "default"}
                onClick={() => handleResult(true)}
              >
                {opts.confirmLabel ?? "확인"}
              </Button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </ConfirmContext.Provider>
  )
}

/**
 * 사용 예:
 *   const confirm = useConfirm()
 *   if (!(await confirm({ title: "정말 삭제할까요?", danger: true }))) return
 */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  if (!ctx) {
    // Provider 없을 때 임시로 native confirm 으로 fallback.
    return async (opts) =>
      typeof window !== "undefined" &&
      window.confirm(opts?.title ?? opts?.description ?? "확인하시겠어요?")
  }
  return ctx
}
