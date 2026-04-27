import type { DonationStatus } from "@/shared/types/database"
import { cn } from "@/shared/lib/utils"

const STATUS_LABEL: Record<DonationStatus, string> = {
  pending: "검토중",
  approved: "기록완료",
  rejected: "반려",
}

const STATUS_STYLE: Record<DonationStatus, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved: "bg-primary/15 text-primary",
  rejected: "bg-muted text-muted-foreground",
}

export function DonationStatusBadge({ status }: { status: DonationStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
        STATUS_STYLE[status]
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}
