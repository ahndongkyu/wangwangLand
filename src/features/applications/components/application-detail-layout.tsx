import type { ApplicationStatus } from "@/shared/types/database"

export function ApplicationBadge({ status }: { status: ApplicationStatus }) {
  const color = status === "일정변경요청" ? "bg-amber-500/10 text-amber-900 dark:text-amber-200" : status === "승인" ? "bg-emerald-600/10 text-emerald-800 dark:text-emerald-300" : "bg-muted text-foreground"
  return <span className={`inline-block rounded-md px-2 py-1 text-xs font-medium ${color}`}>{status}</span>
}
