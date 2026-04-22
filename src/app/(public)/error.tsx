"use client"

import { ErrorShell } from "@/shared/components/error-shell"

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorShell
      error={error}
      reset={reset}
      homeHref="/"
      homeLabel="홈으로 가기"
    />
  )
}
