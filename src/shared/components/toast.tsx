"use client"

import {
  Check,
  X,
  AlertTriangle,
  Info,
  Minus,
  Loader2,
} from "lucide-react"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"

import { cn } from "@/shared/lib/utils"

// ─── 타입 ────────────────────────────────────────────────────────────────────

export type ToastType = "success" | "error" | "warning" | "info" | "neutral" | "loading"

export interface ToastOptions {
  duration?: number
  action?: { label: string; onClick: () => void }
  /** toast가 (action 제외) 닫힐 때 호출 */
  onDismiss?: () => void
}

interface Toast {
  id: number
  message: string
  type: ToastType
  opts: ToastOptions
}

interface ToastApi {
  success: (message: string, opts?: ToastOptions) => void
  error: (message: string, opts?: ToastOptions) => void
  warning: (message: string, opts?: ToastOptions) => void
  info: (message: string, opts?: ToastOptions) => void
  neutral: (message: string, opts?: ToastOptions) => void
  loading: (message: string, opts?: ToastOptions) => number
  dismiss: (id: number) => void
}

// ─── 컬러 설정 ───────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  ToastType,
  {
    Icon: React.ElementType
    iconBg: string       // Tailwind light
    iconColor: string    // Tailwind light
    darkIconBg: string   // Tailwind dark
    darkIconColor: string
    defaultDuration: number
  }
> = {
  success: {
    Icon: Check,
    iconBg: "bg-[#E8F1E5]",
    iconColor: "text-[#4A7C3A]",
    darkIconBg: "dark:bg-[#2E3B2A]",
    darkIconColor: "dark:text-[#9BC88E]",
    defaultDuration: 3500,
  },
  error: {
    Icon: X,
    iconBg: "bg-[#FCEBEB]",
    iconColor: "text-[#A32D2D]",
    darkIconBg: "dark:bg-[#3F1E1E]",
    darkIconColor: "dark:text-[#E67B7B]",
    defaultDuration: 4500,
  },
  warning: {
    Icon: AlertTriangle,
    iconBg: "bg-[#FAEEDA]",
    iconColor: "text-[#BA7517]",
    darkIconBg: "dark:bg-[#3F321A]",
    darkIconColor: "dark:text-[#E8B96A]",
    defaultDuration: 4000,
  },
  info: {
    Icon: Info,
    iconBg: "bg-[#FCE9D9]",
    iconColor: "text-[#C06B2A]",
    darkIconBg: "dark:bg-[#3D2815]",
    darkIconColor: "dark:text-[#F0B079]",
    defaultDuration: 3500,
  },
  neutral: {
    Icon: Minus,
    iconBg: "bg-[#F1EFE8]",
    iconColor: "text-[#5F5E5A]",
    darkIconBg: "dark:bg-[#302B25]",
    darkIconColor: "dark:text-[#B5A995]",
    defaultDuration: 4000,
  },
  loading: {
    Icon: Loader2,
    iconBg: "bg-[#F1EFE8]",
    iconColor: "text-[#5F5E5A]",
    darkIconBg: "dark:bg-[#302B25]",
    darkIconColor: "dark:text-[#B5A995]",
    defaultDuration: 999_999,
  },
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastApi | null>(null)

// ─── Provider ────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(0)
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const toastsRef = useRef<Toast[]>([])
  useEffect(() => { toastsRef.current = toasts }, [toasts])

  const dismiss = useCallback((id: number, fromAction = false) => {
    const toast = toastsRef.current.find((t) => t.id === id)
    if (toast?.opts.onDismiss && !fromAction) toast.opts.onDismiss()
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const t = timers.current.get(id)
    if (t) { clearTimeout(t); timers.current.delete(id) }
  }, [])

  const show = useCallback(
    (message: string, type: ToastType, opts: ToastOptions = {}): number => {
      const id = ++idRef.current
      const duration = opts.duration ?? TYPE_CONFIG[type].defaultDuration
      setToasts((prev) => [...prev, { id, message, type, opts }])
      if (duration < 999_000) {
        const t = setTimeout(() => dismiss(id), duration)
        timers.current.set(id, t)
      }
      return id
    },
    [dismiss]
  )

  const api: ToastApi = {
    success: (m, o) => { show(m, "success", o) },
    error:   (m, o) => { show(m, "error",   o) },
    warning: (m, o) => { show(m, "warning", o) },
    info:    (m, o) => { show(m, "info",    o) },
    neutral: (m, o) => { show(m, "neutral", o) },
    loading: (m, o) =>   show(m, "loading", o),
    dismiss,
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

// ─── Viewport ────────────────────────────────────────────────────────────────

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[]
  onDismiss: (id: number, fromAction?: boolean) => void
}) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-auto sm:top-4"
      role="region"
      aria-label="알림"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

// ─── Item ─────────────────────────────────────────────────────────────────────

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast
  onDismiss: (id: number, fromAction?: boolean) => void
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const cfg = TYPE_CONFIG[toast.type]
  const { action } = toast.opts

  return (
    <div
      role={toast.type === "error" ? "alert" : "status"}
      aria-live={toast.type === "error" ? "assertive" : "polite"}
      className={cn(
        // 레이아웃 + 필 형태
        "pointer-events-auto flex w-max min-w-[180px] max-w-[420px] items-center gap-2.5 rounded-full px-3 py-2",
        // 배경 + 텍스트
        "bg-white text-[#2C2C2A]",
        "dark:bg-[#2B2520] dark:text-[#F5EDE0]",
        // 테두리 + 그림자
        "border border-black/[0.04] dark:border-[#3A3229]",
        "shadow-[0_4px_16px_rgba(60,40,20,0.10)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.35)]",
        // 애니메이션
        "transition-all duration-200",
        mounted
          ? "translate-y-0 opacity-100"
          : "-translate-y-2 opacity-0",
      )}
    >
      {/* 아이콘 */}
      <span
        className={cn(
          "flex size-[22px] shrink-0 items-center justify-center rounded-full",
          cfg.iconBg, cfg.iconColor,
          cfg.darkIconBg, cfg.darkIconColor,
        )}
      >
        <cfg.Icon
          className={cn(
            "size-[11px]",
            toast.type === "loading" && "animate-spin"
          )}
          aria-hidden
        />
      </span>

      {/* 메시지 */}
      <p className="text-[13px] font-medium leading-none">
        {toast.message}
      </p>

      {/* Undo 액션 버튼 */}
      {action && (
        <button
          type="button"
          onClick={() => {
            action.onClick()
            onDismiss(toast.id, true)
          }}
          className="ml-1 shrink-0 rounded-full bg-[#FAF3E8] px-2.5 py-1 text-[12px] font-semibold text-[#C06B2A] transition-opacity hover:opacity-80 dark:bg-[#3D2815] dark:text-[#F0B079]"
        >
          {action.label}
        </button>
      )}

      {/* 닫기 버튼 (loading 제외) */}
      {toast.type !== "loading" && (
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          aria-label="닫기"
          className="ml-0.5 shrink-0 rounded-full p-1 opacity-30 transition-opacity hover:opacity-70"
        >
          <X className="size-2.5" aria-hidden />
        </button>
      )}
    </div>
  )
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    const noop = () => {}
    return {
      success: noop, error: noop, warning: noop,
      info: noop, neutral: noop,
      loading: () => 0,
      dismiss: noop,
    }
  }
  return ctx
}
