"use client"

import { useActionState, useEffect, useRef } from "react"
import { updateNickname } from "../api/actions"

const initialState = { error: null as string | null }

export function OnboardingForm({ defaultNickname }: { defaultNickname?: string }) {
  const [state, action, pending] = useActionState(updateNickname, initialState)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="nickname" className="block text-sm font-medium text-foreground">
          닉네임 <span className="text-destructive">*</span>
        </label>
        <p className="mt-0.5 text-xs text-muted-foreground">
          한글, 영문, 숫자, _ 사용 가능 · 2~20자
        </p>
        <input
          ref={inputRef}
          id="nickname"
          name="nickname"
          type="text"
          defaultValue={defaultNickname}
          maxLength={20}
          required
          className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="홈페이지에서 사용할 닉네임"
        />
      </div>

      {state.error && (
        <p className="text-sm text-destructive" role="alert">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-primary py-3 text-base font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "저장 중..." : "완료"}
      </button>
    </form>
  )
}
