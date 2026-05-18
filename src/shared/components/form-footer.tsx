"use client"

import { Button } from "@/shared/components/ui/button"

interface Props {
  pending: boolean
  /** 제출 버튼 라벨 (예: "입양 신청하기", "후원 등록하기") */
  submitLabel: string
  /** 제출 진행 중 표시할 라벨 (기본: "처리 중...") */
  pendingLabel?: string
  /** 취소 버튼 클릭 핸들러 (보통 router.back()) */
  onCancel: () => void
  /** 취소 버튼 라벨 (기본: "취소") */
  cancelLabel?: string
  /** 제출 버튼 disabled 추가 조건 */
  disabled?: boolean
}

/**
 * 신청·후원 폼 공통 푸터.
 * - 모바일: 세로 스택 (제출 위, 취소 아래)
 * - 데스크탑: 가로 (취소 좌, 제출 우)
 */
export function FormFooter({
  pending,
  submitLabel,
  pendingLabel = "처리 중...",
  onCancel,
  cancelLabel = "취소",
  disabled = false,
}: Props) {
  return (
    <div className="flex flex-row gap-2 pt-2">
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={onCancel}
        disabled={pending}
        className="flex-1"
      >
        {cancelLabel}
      </Button>
      <Button
        type="submit"
        size="lg"
        disabled={pending || disabled}
        className="flex-[2]"
      >
        {pending ? pendingLabel : submitLabel}
      </Button>
    </div>
  )
}
