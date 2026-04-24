"use client"

import { AlertDialog } from "@base-ui/react/alert-dialog"
import { AlertTriangle, Trash2, UserX, XCircle } from "lucide-react"
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react"

import { cn } from "@/shared/lib/utils"

// ─── 타입 ────────────────────────────────────────────────────────────────────

export type ConfirmVariant = "destructive" | "warning" | "critical" | "admin"

export interface ConfirmOptions {
  variant?: ConfirmVariant
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  /** critical 변형: 유저가 입력해야 할 문구 (기본 "확인하겠습니다") */
  phrase?: string
  /** admin 변형: 반려 사유 textarea 표시 여부 */
  withReason?: boolean
  reasonPlaceholder?: string
  // 하위 호환 (기존 코드)
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

/** false = 취소, { ok: true; reason?: string } = 확인 */
export type ConfirmResult = false | { ok: true; reason?: string }
export type ConfirmFn = (opts: ConfirmOptions) => Promise<ConfirmResult>

// ─── Context ─────────────────────────────────────────────────────────────────

const ConfirmContext = createContext<ConfirmFn | null>(null)

interface Pending {
  opts: ConfirmOptions
  resolve: (r: ConfirmResult) => void
}

// ─── 변형별 스타일 / 기본값 ────────────────────────────────────────────────────

const VARIANT_CONFIG = {
  destructive: {
    Icon: Trash2,
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
    confirmCls: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    defaultConfirmText: "삭제",
    defaultCancelText: "취소",
  },
  warning: {
    Icon: AlertTriangle,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-600",
    confirmCls: "bg-amber-500 text-white hover:bg-amber-600",
    defaultConfirmText: "확인",
    defaultCancelText: "돌아가기",
  },
  critical: {
    Icon: UserX,
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
    confirmCls: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    defaultConfirmText: "탈퇴",
    defaultCancelText: "돌아가기",
  },
  admin: {
    Icon: XCircle,
    iconBg: "bg-[#FAECE7]",
    iconColor: "text-[#993C1D]",
    confirmCls: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    defaultConfirmText: "반려",
    defaultCancelText: "취소",
  },
} satisfies Record<ConfirmVariant, {
  Icon: React.ElementType
  iconBg: string
  iconColor: string
  confirmCls: string
  defaultConfirmText: string
  defaultCancelText: string
}>

// ─── Provider ────────────────────────────────────────────────────────────────

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null)

  const confirm = useCallback<ConfirmFn>((opts) => {
    return new Promise<ConfirmResult>((resolve) => {
      setPending({ opts, resolve })
    })
  }, [])

  function handleResult(r: ConfirmResult) {
    pending?.resolve(r)
    setPending(null)
  }

  const opts = pending?.opts

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog.Root
        open={pending !== null}
        onOpenChange={(open) => { if (!open) handleResult(false) }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/50 transition-opacity duration-200 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0" />
          <AlertDialog.Popup
            className={cn(
              "fixed left-1/2 top-1/2 z-50 w-[min(90vw,22rem)] -translate-x-1/2 -translate-y-1/2",
              "rounded-2xl border border-border bg-card p-6 shadow-2xl",
              "transition-all duration-200",
              "data-[starting-style]:scale-95 data-[starting-style]:opacity-0",
              "data-[ending-style]:scale-95 data-[ending-style]:opacity-0"
            )}
          >
            {opts && <ConfirmBody opts={opts} onResult={handleResult} />}
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </ConfirmContext.Provider>
  )
}

// ─── 다이얼로그 본문 ──────────────────────────────────────────────────────────

function ConfirmBody({
  opts,
  onResult,
}: {
  opts: ConfirmOptions
  onResult: (r: ConfirmResult) => void
}) {
  // 하위 호환: danger → destructive, 없으면 destructive 기본
  const variant: ConfirmVariant = opts.variant ?? (opts.danger ? "destructive" : "destructive")
  const cfg = VARIANT_CONFIG[variant]

  const confirmText = opts.confirmText ?? opts.confirmLabel ?? cfg.defaultConfirmText
  const cancelText = opts.cancelText ?? opts.cancelLabel ?? cfg.defaultCancelText

  // critical 변형
  const phrase = opts.phrase ?? "확인하겠습니다"
  const [phraseInput, setPhraseInput] = useState("")
  const phraseMatch = phraseInput === phrase

  // admin 변형 reason
  const [reason, setReason] = useState("")

  function handleConfirm() {
    onResult({ ok: true, reason: reason || undefined })
  }

  const confirmDisabled =
    (variant === "critical" && !phraseMatch)

  return (
    <>
      {/* 아이콘 */}
      <div className={cn("mx-auto mb-4 flex size-12 items-center justify-center rounded-full", cfg.iconBg)}>
        <cfg.Icon className={cn("size-6", cfg.iconColor)} />
      </div>

      {/* 텍스트 */}
      <AlertDialog.Title className="text-center text-base font-bold text-foreground">
        {opts.title}
      </AlertDialog.Title>
      {opts.description && (
        <AlertDialog.Description className="mt-1.5 text-center text-sm leading-relaxed text-muted-foreground">
          {opts.description}
        </AlertDialog.Description>
      )}

      {/* critical: 문구 입력 */}
      {variant === "critical" && (
        <div className="mt-4">
          <p className="mb-1.5 text-xs text-muted-foreground">
            확인을 위해 <span className="font-semibold text-foreground">"{phrase}"</span>를 입력해 주세요
          </p>
          <input
            type="text"
            value={phraseInput}
            onChange={(e) => setPhraseInput(e.target.value)}
            placeholder={phrase}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-destructive"
          />
        </div>
      )}

      {/* admin: 반려 사유 */}
      {variant === "admin" && opts.withReason && (
        <div className="mt-4">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={opts.reasonPlaceholder ?? "반려 사유 (선택)"}
            rows={3}
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
      )}

      {/* 버튼 */}
      <div className="mt-5 flex gap-2">
        <AlertDialog.Close
          onClick={() => onResult(false)}
          className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
        >
          {cancelText}
        </AlertDialog.Close>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={confirmDisabled}
          className={cn(
            "flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
            cfg.confirmCls
          )}
        >
          {confirmText}
        </button>
      </div>
    </>
  )
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * 사용 예:
 *   const confirm = useConfirm()
 *   const ok = await confirm({ variant: 'destructive', title: '댓글을 삭제할까요?', description: '삭제한 댓글은 복구할 수 없어요.', confirmText: '삭제' })
 *   if (!ok) return
 */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  if (!ctx) {
    return async (opts) =>
      typeof window !== "undefined" &&
      window.confirm(opts.title ?? opts.description ?? "확인하시겠어요?")
        ? { ok: true }
        : false
  }
  return ctx
}
