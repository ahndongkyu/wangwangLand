"use client"

import { useActionState, useState } from "react"
import { signInWithEmail } from "../api/actions"
import { Input } from "@/shared/components/ui/input"
import { Button } from "@/shared/components/ui/button"
import { ChevronDown } from "lucide-react"

const initialState = { error: null as string | null }

export function EmailLoginForm() {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(signInWithEmail, initialState)

  return (
    <div className="mt-6 border-t border-border pt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-center gap-1 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
      >
        <ChevronDown className={`size-3 transition-transform ${open ? "rotate-180" : ""}`} />
        테스트 계정 로그인
      </button>

      {open && (
        <form action={action} className="mt-3 space-y-2">
          <Input
            name="email"
            type="email"
            placeholder="이메일"
            autoComplete="email"
            required
            className="text-sm"
          />
          <Input
            name="password"
            type="password"
            placeholder="비밀번호"
            autoComplete="current-password"
            required
            className="text-sm"
          />
          {state.error && (
            <p className="text-xs text-destructive">{state.error}</p>
          )}
          <Button type="submit" disabled={pending} variant="outline" className="w-full text-sm">
            {pending ? "로그인 중..." : "로그인"}
          </Button>
        </form>
      )}
    </div>
  )
}
