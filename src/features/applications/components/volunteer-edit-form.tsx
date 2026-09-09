"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import Link from "next/link"

import { updateMyVolunteerApplication, requestReschedule } from "../api/mutations"
import {
  getVolunteerTimeOptions,
  validateVolunteerSchedule,
} from "../lib/volunteer-operating-hours"
import {
  getVolunteerApplicantParts,
  normalizeVolunteerGroupName,
} from "../lib/volunteer-applicant"
import { VolunteerTimeField } from "./volunteer-time-field"
import { LargeGroupInquiry } from "./volunteer-application-guide"
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
  validateGroupPartySize,
  validateKoreanPhone,
  validateName,
  validateOrgOrPersonName,
  validatePartySize,
} from "@/shared/lib/validation"
import type { VolunteerActivity, VolunteerApplication } from "@/shared/types/database"

const ACTIVITIES: VolunteerActivity[] = ["산책", "목욕·미용", "청소·정리", "홍보·촬영"]

interface Props {
  application: VolunteerApplication
  isReschedule?: boolean
}

export function VolunteerEditForm({
  application,
  isReschedule = false,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const isGroup = application.party_size > 1
  const applicantParts = getVolunteerApplicantParts(
    application.applicant_name,
    application.group_name
  )
  const defaultGroupName = applicantParts.groupName ?? ""
  const defaultApplicantName = applicantParts.applicantName

  // 일정변경요청 모드면 reschedule_dates를 초기값으로
  const initialDates = isReschedule
    ? (application.reschedule_dates ?? application.available_dates ?? [])
    : (application.available_dates ?? [])
  const [selectedDates, setSelectedDates] = useState<string[]>(initialDates)
  const [activities, setActivities] = useState<string[]>(application.activities ?? [])

  const defaultTime = isReschedule
    ? (application.reschedule_time ?? application.available_time ?? "")
    : (application.available_time ?? "")
  const [visitHour, setVisitHour] = useState(defaultTime ? defaultTime.split(":")[0] : "")
  const [visitMinute, setVisitMinute] = useState(defaultTime ? (defaultTime.split(":")[1] ?? "") : "")
  const visitTime = visitHour && visitMinute ? `${visitHour}:${visitMinute}` : ""

  function handleDatesChange(dates: string[]) {
    setSelectedDates(dates)
    const nextOptions = getVolunteerTimeOptions(dates)
    if (visitHour && !nextOptions.some((time) => time.startsWith(`${visitHour}:`))) {
      setVisitHour("")
      setVisitMinute("")
    } else if (visitTime && !nextOptions.includes(visitTime)) {
      setVisitMinute("")
    }
  }

  function toggleActivity(name: string) {
    setActivities((prev) =>
      prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]
    )
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)

    const scheduleError = validateVolunteerSchedule(selectedDates, visitTime)
    if (scheduleError) return setError(scheduleError)

    if (isReschedule) {
      // 일정변경 요청 모드: dates를 JSON으로 직렬화
      fd.set("available_dates", JSON.stringify(selectedDates))
      fd.set("available_time", visitTime)
      startTransition(async () => {
        const result = await requestReschedule(application.id, fd)
        if (result.error) {
          setError(result.error)
          return
        }
        router.push("/my/applications")
        router.refresh()
      })
      return
    }

    // 일반 수정 모드
    if (isGroup) {
      const groupName = normalizeVolunteerGroupName(
        String(fd.get("group_name") ?? "")
      )
      if (groupName) {
        const groupNameCheck = validateOrgOrPersonName(groupName)
        if (!groupNameCheck.valid) {
          return setError(`단체명: ${groupNameCheck.error}`)
        }
      }
    }
    const nameCheck = validateName(String(fd.get("applicant_name") ?? ""))
    if (!nameCheck.valid) return setError(nameCheck.error!)
    const phoneCheck = validateKoreanPhone(String(fd.get("phone") ?? ""))
    if (!phoneCheck.valid) return setError(phoneCheck.error!)
    const partyCheck = isGroup
      ? validateGroupPartySize(String(fd.get("party_size") ?? "1"))
      : validatePartySize(String(fd.get("party_size") ?? "1"))
    if (!partyCheck.valid) return setError(partyCheck.error!)
    fd.set("party_type", isGroup ? "group" : "individual")

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
      {isReschedule && (
        <div className="rounded-lg border border-blue-200 bg-blue-50/60 px-4 py-3 text-sm text-blue-800 dark:border-blue-800/40 dark:bg-blue-950/30 dark:text-blue-300">
          희망 날짜와 시간을 선택해 일정변경을 요청하세요. 운영진 확인 후 확정됩니다.
        </div>
      )}

      {!isReschedule && (
        <>
          {isGroup && (
            <div className="space-y-1.5">
              <Label htmlFor="group_name">단체명 (선택)</Label>
              <Input
                id="group_name"
                name="group_name"
                maxLength={30}
                defaultValue={defaultGroupName}
                placeholder="예: 왕왕대학교 봉사동아리"
              />
              <p className="text-xs text-muted-foreground">
                비워두거나 X, 없음으로 입력하면 단체명 없이 저장됩니다.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="applicant_name">{isGroup ? "인솔자 이름" : "신청자 이름"} *</Label>
            <Input
              id="applicant_name"
              name="applicant_name"
              required
              maxLength={20}
              pattern={NAME_PATTERN_RAW}
              title={NAME_HINT}
              defaultValue={defaultApplicantName}
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
              min={isGroup ? 2 : 1}
              max={30}
              required
              defaultValue={application.party_size ?? 1}
            />
            <p className="text-xs text-muted-foreground">
              {isGroup ? "인솔자 포함, 최대 30명" : "본인 포함 1명"}
            </p>
            {isGroup && <LargeGroupInquiry />}
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label>봉사 가능 날짜 *</Label>
        <DateMultiPicker
          name="available_dates"
          defaultValue={initialDates}
          onChange={handleDatesChange}
        />
      </div>

      <VolunteerTimeField
        selectedDates={selectedDates}
        hour={visitHour}
        minute={visitMinute}
        onHourChange={setVisitHour}
        onMinuteChange={setVisitMinute}
        required
      />

      {!isReschedule && (
        <>
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
        </>
      )}

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
          {pending ? "저장 중..." : isReschedule ? "일정변경 요청" : "변경 저장"}
        </Button>
      </div>
    </form>
  )
}
