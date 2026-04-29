import { DogCard } from "./dog-card"
import type { Dog } from "@/shared/types/database"

interface Props {
  dogs: Dog[]
  emptyMessage?: string
  /**
   * 화면 크기별로 점진적으로 노출되는 카드 수.
   * 예: { mobile: 6, lg: 8, xl: 10 }
   *  - 0~5번 카드: 항상 보임
   *  - 6~7번 카드: lg 이상에서만 보임
   *  - 8~9번 카드: xl 이상에서만 보임
   * 빈 객체이거나 미지정이면 모든 카드 항상 보임.
   * 하위 호환: mobileLimit 만 지정해도 동작 (md 이상에서 나머지 노출).
   */
  tieredLimits?: { mobile?: number; md?: number; lg?: number; xl?: number }
  /** @deprecated tieredLimits.mobile 사용 권장 */
  mobileLimit?: number
}

export function DogGrid({
  dogs,
  emptyMessage = "아직 등록된 아이가 없어요.",
  mobileLimit,
  tieredLimits,
}: Props) {
  if (dogs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  // mobileLimit 만 들어와도 기존 동작 유지
  const limits = tieredLimits ?? (mobileLimit !== undefined ? { mobile: mobileLimit } : undefined)

  function visibilityClass(i: number): string {
    if (!limits) return ""
    const m = limits.mobile ?? Infinity
    if (i < m) return "" // 모바일부터 보임
    const md = limits.md ?? m
    if (i < md) return "hidden md:block"
    const lg = limits.lg ?? md
    if (i < lg) return "hidden lg:block"
    const xl = limits.xl ?? lg
    if (i < xl) return "hidden xl:block"
    return "hidden" // 어디에도 안 보임 (사실상 노출 제외)
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {dogs.map((dog, i) => {
        const cls = visibilityClass(i)
        return (
          <div key={dog.id} className={cls || undefined}>
            <DogCard dog={dog} />
          </div>
        )
      })}
    </div>
  )
}
