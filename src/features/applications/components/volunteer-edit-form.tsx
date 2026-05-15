"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import Link from "next/link"

import { updateMyVolunteerApplication } from "../api/mutations"
import { DateMultiPicker } from "@/shared/components/date-multi-picker"
import { Button } from "@/shared/components/ui/button"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { PhoneInput } from "@/shared/components/phone-input"
import { Textarea } from "@/shared/components/ui/textarea"
import {
  NAME_HINT,
  NAME_PATTERN_RAW,
  validateKoreanPhone,
  validateName,
  validatePartySize,
} from "@/shared/lib/validation"
import type { VolunteerActivity, VolunteerApplication } from "@/shared/types/database"

const ACTIVITIES: VolunteerActivity[] = ["산책", "목욕·미용", "청소·정리", "홍보·촬영"]

interface Props {
  application: VolunteerApplication
}

export function VolunteerEditForm({ application }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [selectedDates, setSelectedDates] = useState<string[]>(application.available_dates ?? [])
  const [activities, setActivities] = useState<string[]>(application.activities ?? [])

  const defaultTime = application.available_time ?? ""
  const [visitHour, setVisitHour] = useState(defaultTime ? defaultTime.split(":")[0] : "")
  const [visitMinute, setVisitMinute] = useState(defaultTime ? (defaultTime.split(":")[1] ?? "00") : "00")
  const visitTime = visitHour ? `${visitHour}:${visitMinute}` : ""

  function toggleActivity(name: string) {
    setActivities((prev) =>
      prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]
    )
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)

    const nameCheck = validateName(String(fd.get("applicant_name") ?? ""))
    if (!nameCheck.valid) return setError(nameCheck.error!)
    const phoneCheck = validateKoreanPhone(String(fd.get("phone") ?? ""))
    if (!phoneCheck.valid) return setError(phoneCheck.error!)
    const partyCheck = validatePartySize(String(fd.get("party_size") ?? "1"))
    if (!partyCheck.valid) return setError(partyCheck.error!)
    if (selectedDates.length === 0) return setError("봉사 가능 날짜를 1개 이상 선택해주세요.")

    startTransition(async () => {
      const result = await updateMyVolunteerApplication(application.id, fd)
      if (result.error) {
        setError(result.error)
        return
      }
      router.push("/my/applications")
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="applicant_name">신청자 이름 *</Label>
        <Input
          id="applicant_name"
          name="applicant_name"
          required
          maxLength={20}
          pattern={NAME_PATTERN_RAW}
          title={NAME_HINT}
          defaultValue={application.applicant_name}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">전화번호 *</Label>
        <PhoneInput id="phone" name="phone" required defaultValue={application.phone} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="party_size">인원 (본인 포함) *</Label>
        <Input
          id="party_size"
          name="party_size"
          type="number"
          min={1}
          max={20}
          required
          defaultValue={application.party_size ?? 1}
        />
      </div>

      <div className="space-y-2">
        <Label>봉사 가능 날짜 *</Label>
        <DateMultiPicker
          name="available_dates"
          defaultValue={application.available_dates ?? []}
          onChange={setSelectedDates}
        />
      </div>

      <div className="space-y-1.5">
        <Label>방문 예정 시간</Label>
        <div className="flex items-center gap-1.5">
          <select
            value={visitHour}
            onChange={(e) => setVisitHour(e.target.value)}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          >
            <option value="">시</option>
            {Array.from({ length: 10 }, (_, i) => {
              const h = String(i + 9).padStart(2, "0")
              return <option key={h} value={h}>{i + 9}시</option>
            })}
          </select>
          <select
            value={visitMinute}
            onChange={(e) => setVisitMinute(e.target.value)}
            disabled={!visitHour}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-40 dark:bg-input/30"
          >
            {["00", "10", "20", "30", "40", "50"].map((m) => (
              <option key={m} value={m}>{m}분</option>
            ))}
          </select>
        </div>
        <input type="hidden" name="available_time" value={visitTime} />
      </div>

      <div className="space-y-2">
        <Label>희망 활동</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ACTIVITIES.map((act) => (
            <label
              key={act}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-secondary"
            >
              <Checkbox
                checked={activities.includes(act)}
                onCheckedChange={() => toggleActivity(act)}
              />
              <span>{act}</span>
              {/* 폼 전송용 hidden input */}
              {activities.includes(act) && (
                <input type="hidden" name="activities" value={act} />
              )}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="message">메모 (선택)</Label>
        <Textarea
          id="message"
          name="message"
          rows={3}
          maxLength={500}
          defaultValue={application.message ?? ""}
          placeholder="특이사항이나 문의사항을 적어주세요."
        />
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        <Link
          href="/my/applications"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          취소
        </Link>
        <Button type="submit" disabled={pending}>
          {pending ? "저장 중..." : "변경 저장"}
        </Button>
      </div>
    </form>
  )
}
