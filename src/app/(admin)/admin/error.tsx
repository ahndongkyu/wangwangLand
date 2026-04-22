"use client"

import { ErrorShell } from "@/shared/components/error-shell"

export default function AdminError({
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
      homeHref="/admin"
      homeLabel="대시보드"
    />
  )
}
