"use client"

import { useState, useTransition } from "react"

import { cancelSignup, createSignup } from "../api/mutations"
import type { EventSignup } from "../types"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Textarea } from "@/shared/components/ui/textarea"
import { useToast } from "@/shared/components/toast"

interface Props {
  eventId: string
  signupEnabled: boolean
  pastEvent: boolean
  isLoggedIn: boolean
  mySignup: EventSignup | null
}

export function SignupForm({
  eventId,
  signupEnabled,
  pastEvent,
  isLoggedIn,
  mySignup,
}: Props) {
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  const [confirmCancel, setConfirmCancel] = useState(false)

  if (!signupEnabled) {
    return (
      <p className="rounded-md border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
        이 일정은 신청을 받지 않습니다.
      </p>
    )
  }

  if (pastEvent) {
    return (
      <p className="rounded-md border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
        이미 종료된 일정입니다.
      </p>
    )
  }

  if (!isLoggedIn) {
    return (
      <a
        href="/login"
        className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        로그인하고 신청하기
      </a>
    )
  }

  // 이미 신청한 상태
  if (mySignup && mySignup.status === "접수") {
    return (
      <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/40 dark:bg-emerald-900/10">
        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          신청 완료 · {mySignup.party_size}명
        </p>
        {mySignup.message && (
          <p className="text-xs text-muted-foreground">메모: {mySignup.message}</p>
        )}
        {!confirmCancel ? (
          <button
            type="button"
            onClick={() => setConfirmCancel(true)}
            className="text-xs text-destructive underline-offset-4 hover:underline"
          >
            신청 취소
          </button>
        ) : (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-foreground">정말 취소할까요?</span>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  const res = await cancelSignup(eventId)
                  if (res.error) toast.error(res.error)
                  else toast.success("신청이 취소되었습니다")
                })
              }}
              className="font-semibold text-destructive hover:underline disabled:opacity-50"
            >
              {pending ? "처리 중..." : "취소"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmCancel(false)}
              className="text-muted-foreground hover:underline"
            >
              유지
            </button>
          </div>
        )}
      </div>
    )
  }

  // 신청 폼
  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          const res = await createSignup(eventId, formData)
          if (res.error) toast.error(res.error)
          else toast.success("신청이 완료되었습니다")
        })
      }}
      className="space-y-3 rounded-lg border border-border bg-card p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="party_size">인원수</Label>
          <Input
            id="party_size"
            name="party_size"
            type="number"
            min={1}
            max={20}
            defaultValue={1}
            required
          />
          <p className="text-[11px] text-muted-foreground">본인 포함, 최대 20명</p>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="message">메모 (선택)</Label>
        <Textarea
          id="message"
          name="message"
          rows={2}
          maxLength={300}
          placeholder="특이사항·문의 등을 적어주세요."
        />
      </div>
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "신청 중..." : "신청하기"}
      </Button>
    </form>
  )
}
