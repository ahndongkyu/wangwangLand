"use client"

import { useMemo, useState, useTransition } from "react"
import { ChevronLeft, ChevronRight, Trash2, X } from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { useToast } from "@/shared/components/toast"
import { cn } from "@/shared/lib/utils"
import { upsertStaffAvailability, deleteStaffAvailability } from "../api/mutations"
import type { StaffAvailabilityWithUser, StaffOption } from "../api/queries"

interface Props {
  /** 현재 표시 중인 월 시작일 (서버에서 결정, 페이지 새로고침으로 월 이동) */
  monthStart: string // YYYY-MM-01
  items: StaffAvailabilityWithUser[]
  staff: StaffOption[]
  currentUserId: string
}

function pad(n: number) {
  return String(n).padStart(2, "0")
}

function dateString(y: number, m: number, d: number): string {
  return `${y}-${pad(m + 1)}-${pad(d)}`
}

function formatTime(time: string | null): string {
  if (!time) return ""
  return time.slice(0, 5)
}

function buildMonthGrid(monthStart: string): { weeks: (string | null)[][]; year: number; month: number } {
  const [y, m] = monthStart.split("-").map(Number)
  const year = y
  const month = m - 1 // 0-indexed
  const firstDay = new Date(year, month, 1).getDay() // 0=Sun
  const lastDate = new Date(year, month + 1, 0).getDate()

  const days: (string | null)[] = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let d = 1; d <= lastDate; d++) days.push(dateString(year, month, d))
  while (days.length % 7 !== 0) days.push(null)

  const weeks: (string | null)[][] = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))

  return { weeks, year, month: month + 1 }
}

function shiftMonth(monthStart: string, delta: number): string {
  const [y, m] = monthStart.split("-").map(Number)
  const date = new Date(y, m - 1 + delta, 1)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-01`
}

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"]

export function StaffScheduleCalendar({ monthStart, items, staff, currentUserId }: Props) {
  const { weeks, year, month } = useMemo(() => buildMonthGrid(monthStart), [monthStart])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // 날짜별 항목 묶기
  const byDate = useMemo(() => {
    const map: Record<string, StaffAvailabilityWithUser[]> = {}
    for (const it of items) {
      if (!map[it.date]) map[it.date] = []
      map[it.date].push(it)
    }
    return map
  }, [items])

  function handleNav(delta: number) {
    const next = shiftMonth(monthStart, delta)
    window.location.href = `/admin/schedule?month=${next}`
  }

  return (
    <>
      {/* 월 네비 */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {year}년 {month}월
        </h2>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => handleNav(-1)} aria-label="이전 달">
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => (window.location.href = "/admin/schedule")}>
            오늘
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleNav(1)} aria-label="다음 달">
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* 캘린더 그리드 */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="grid grid-cols-7 border-b border-border bg-secondary/30">
          {WEEKDAY_LABELS.map((label, i) => (
            <div
              key={label}
              className={cn(
                "px-2 py-2 text-center text-xs font-semibold",
                i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-muted-foreground"
              )}
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {weeks.flat().map((day, idx) => {
            if (!day) {
              return <div key={idx} className="min-h-[110px] border-b border-r border-border bg-secondary/10" />
            }
            const dayNum = Number(day.split("-")[2])
            const dow = idx % 7
            const dayItems = byDate[day] ?? []
            const today = new Date().toISOString().slice(0, 10)
            const isToday = day === today
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "min-h-[110px] border-b border-r border-border bg-card p-1.5 text-left transition-colors hover:bg-secondary/30",
                  isToday && "bg-primary/5"
                )}
              >
                <div
                  className={cn(
                    "mb-1 inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold",
                    isToday ? "bg-primary text-primary-foreground" : dow === 0 ? "text-red-500" : dow === 6 ? "text-blue-500" : "text-foreground"
                  )}
                >
                  {dayNum}
                </div>
                <ul className="space-y-0.5">
                  {dayItems.slice(0, 3).map((it) => (
                    <li
                      key={it.id}
                      className={cn(
                        "truncate rounded px-1 py-0.5 text-[10px] font-medium",
                        it.user_id === currentUserId
                          ? "bg-primary/15 text-primary"
                          : "bg-secondary text-foreground"
                      )}
                    >
                      {it.user?.nickname ?? "운영진"}
                      {it.start_time && (
                        <span className="ml-1 opacity-70">{formatTime(it.start_time)}</span>
                      )}
                    </li>
                  ))}
                  {dayItems.length > 3 && (
                    <li className="text-[10px] text-muted-foreground">+{dayItems.length - 3}명</li>
                  )}
                </ul>
              </button>
            )
          })}
        </div>
      </div>

      {selectedDate && (
        <ScheduleEditModal
          date={selectedDate}
          items={byDate[selectedDate] ?? []}
          staff={staff}
          currentUserId={currentUserId}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </>
  )
}

// ===== Modal =====

interface ModalProps {
  date: string
  items: StaffAvailabilityWithUser[]
  staff: StaffOption[]
  currentUserId: string
  onClose: () => void
}

function ScheduleEditModal({ date, items, staff, currentUserId, onClose }: ModalProps) {
  const toast = useToast()
  const [pending, startTransition] = useTransition()

  // 폼 입력 상태
  const [userId, setUserId] = useState(currentUserId)
  const [allDay, setAllDay] = useState(true)
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("12:00")
  const [note, setNote] = useState("")

  // 선택된 user의 기존 등록이 있으면 초기값 자동 채움
  const existingForUser = items.find((it) => it.user_id === userId)
  const isEditing = !!existingForUser

  function handleUserChange(nextUserId: string) {
    setUserId(nextUserId)
    const existing = items.find((it) => it.user_id === nextUserId)
    if (existing) {
      if (existing.start_time && existing.end_time) {
        setAllDay(false)
        setStartTime(existing.start_time.slice(0, 5))
        setEndTime(existing.end_time.slice(0, 5))
      } else {
        setAllDay(true)
      }
      setNote(existing.note ?? "")
    } else {
      setAllDay(true)
      setStartTime("09:00")
      setEndTime("12:00")
      setNote("")
    }
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await upsertStaffAvailability({
        user_id: userId,
        date,
        start_time: allDay ? null : startTime,
        end_time: allDay ? null : endTime,
        note: note.trim() || null,
      })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(isEditing ? "수정했습니다." : "등록했습니다.")
      onClose()
      window.location.reload()
    })
  }

  function handleDelete() {
    if (!existingForUser) return
    if (!window.confirm("이 출근 등록을 삭제할까요?")) return
    startTransition(async () => {
      const result = await deleteStaffAvailability(existingForUser.id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("삭제했습니다.")
      onClose()
      window.location.reload()
    })
  }

  const dateObj = new Date(date)
  const weekday = WEEKDAY_LABELS[dateObj.getDay()]

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-foreground">
              {date} ({weekday})
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">출근 일정 관리</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-secondary"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* 이미 등록된 다른 운영진들 (참고용) */}
        {items.length > 0 && (
          <div className="mb-4 rounded-lg border border-border bg-secondary/30 p-3 text-xs">
            <p className="mb-2 font-semibold text-foreground">이미 등록된 출근</p>
            <ul className="space-y-1">
              {items.map((it) => (
                <li key={it.id} className="flex items-center justify-between gap-2 text-muted-foreground">
                  <span>
                    <span className="font-medium text-foreground">{it.user?.nickname}</span>
                    {" — "}
                    {it.start_time && it.end_time
                      ? `${formatTime(it.start_time)} ~ ${formatTime(it.end_time)}`
                      : "종일"}
                    {it.registered_by_id && it.registered_by_id !== it.user_id && (
                      <span className="ml-1 text-[10px]">
                        ({it.registered_by?.nickname} 등록)
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="staff-select">운영진</Label>
            <select
              id="staff-select"
              value={userId}
              onChange={(e) => handleUserChange(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            >
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nickname}{s.id === currentUserId ? " (나)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                className="size-4 accent-primary"
              />
              종일
            </label>
            {!allDay && (
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="flex-1"
                />
                <span className="text-muted-foreground">~</span>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="flex-1"
                />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="note">메모 (봉사자에게 보임)</Label>
            <Input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="예: 산책 위주 봉사 가능"
              maxLength={100}
            />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-2">
          {isEditing ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={pending}
              className="text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="size-3.5" />
              삭제
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              취소
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={pending}>
              {pending ? "처리 중..." : isEditing ? "수정" : "등록"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
