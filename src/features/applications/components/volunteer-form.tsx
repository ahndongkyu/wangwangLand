"use client"

import React, { useState, useTransition } from "react"

import { submitVolunteerApplication } from "../api/mutations"
import { Button } from "@/shared/components/ui/button"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Textarea } from "@/shared/components/ui/textarea"
import {
  validateKoreanPhone,
  validateName,
  validatePartySize,
} from "@/shared/lib/validation"
import type { VolunteerActivity } from "@/shared/types/database"

const DAYS = ["월", "화", "수", "목", "금", "토", "일"]
const ACTIVITIES: VolunteerActivity[] = [
  "산책",
  "목욕·미용",
  "청소·정리",
  "홍보·촬영",
]

export function VolunteerForm() {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)

    // 클라이언트 사전 검증
    const nameCheck = validateName(String(formData.get("applicant_name") ?? ""))
    if (!nameCheck.valid) {
      setError(nameCheck.error!)
      return
    }
    const phoneCheck = validateKoreanPhone(String(formData.get("phone") ?? ""))
    if (!phoneCheck.valid) {
      setError(phoneCheck.error!)
      return
    }
    const partyCheck = validatePartySize(
      String(formData.get("party_size") ?? "1")
    )
    if (!partyCheck.valid) {
      setError(partyCheck.error!)
      return
    }

    if (formData.get("privacy_agreed") !== "on") {
      setError("개인정보 수집·이용 동의가 필요합니다.")
      return
    }

    startTransition(async () => {
      const result = await submitVolunteerApplication(formData)
      if (result.error) setError(result.error)
      else setSuccess(true)
    })
  }

  if (success) {
    return (
      <div className="rounded-lg border border-primary bg-primary/5 p-8 text-center">
        <div className="mb-2 text-4xl">🙌</div>
        <h2 className="text-xl font-bold text-foreground">
          봉사 신청이 접수되었습니다
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          운영진이 확인 후 입력하신 연락처로 안내드리겠습니다.
          <br />
          귀한 마음 감사합니다 💕
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="applicant_name">이름 및 단체명 *</Label>
          <Input
            id="applicant_name"
            name="applicant_name"
            required
            minLength={2}
            maxLength={50}
            placeholder="예: 홍길동 / ○○대학교 봉사동아리"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">연락처 *</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            required
            pattern="^0\d{1,2}[- ]?\d{3,4}[- ]?\d{4}$"
            placeholder="010-0000-0000"
          />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="party_size">인원수 *</Label>
          <Input
            id="party_size"
            name="party_size"
            type="number"
            min={1}
            max={20}
            defaultValue={1}
            required
          />
          <p className="text-xs text-muted-foreground">
            함께 오는 인원(본인 포함). 최대 20명까지 기재할 수 있어요.
          </p>
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-foreground">
          가능한 요일
        </legend>
        <div className="flex flex-wrap gap-3">
          {DAYS.map((day) => (
            <label
              key={day}
              className="flex items-center gap-1.5 text-sm"
              htmlFor={`day-${day}`}
            >
              <Checkbox id={`day-${day}`} name="available_days" value={day} />
              {day}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor="available_time">가능한 시간대</Label>
        <Input
          id="available_time"
          name="available_time"
          placeholder="예: 오전 10시~오후 2시"
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-foreground">
          희망 활동 (여러 개 선택 가능)
        </legend>
        <div className="grid grid-cols-2 gap-3">
          {ACTIVITIES.map((activity) => (
            <label
              key={activity}
              className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm"
              htmlFor={`act-${activity}`}
            >
              <Checkbox
                id={`act-${activity}`}
                name="activities"
                value={activity}
              />
              {activity}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor="message">간단한 자기소개 / 메모</Label>
        <Textarea id="message" name="message" rows={4} />
      </div>

      <div className="flex items-start gap-2 rounded-md border border-border bg-secondary/40 p-4">
        <Checkbox id="privacy_agreed" name="privacy_agreed" className="mt-0.5" />
        <Label htmlFor="privacy_agreed" className="cursor-pointer text-sm leading-relaxed">
          개인정보(이름·연락처·인원수)를 봉사 활동 운영 목적으로 수집·이용하는 데
          동의합니다.
        </Label>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "접수 중..." : "봉사 신청하기"}
      </Button>
    </form>
  )
}
