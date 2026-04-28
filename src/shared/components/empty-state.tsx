import { Inbox } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/shared/lib/utils"

interface Props {
  /** 메인 메시지 (없으면 기본 텍스트) */
  title?: string
  /** 부가 설명 */
  description?: string
  /** 사용할 lucide 아이콘 (기본 Inbox) */
  icon?: LucideIcon
  className?: string
}

/**
 * 리스트가 비어있을 때 보여주는 안내 카드.
 * 텍스트만 있던 기존 빈 상태들을 통일된 시각 처리로 교체.
 */
export function EmptyState({
  title = "아직 데이터가 없어요",
  description,
  icon: Icon = Inbox,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card/50 px-6 py-12 text-center",
        className
      )}
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        <Icon className="size-6" aria-hidden />
      </span>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  )
}
