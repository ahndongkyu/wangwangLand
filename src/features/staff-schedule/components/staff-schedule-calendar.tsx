"use client"

import { useMemo, useState, useTransition } from "react"
import { ChevronLeft, ChevronRight, Pencil, Trash2, X } from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { useToast } from "@/shared/components/toast"
import { cn } from "@/shared/lib/utils"
import { upsertStaffAvailability, deleteStaffAvailability } from "../api/mutations"
import type { StaffAvailabilityWithUser, StaffOption } from "../api/queries"
import { isPermanentStaffId } from "../permanent-staff"

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
                  "flex min-h-[110px] flex-col items-start border-b border-r border-border bg-card p-1.5 text-left transition-colors hover:bg-secondary/30",
                  isToday && "bg-primary/5"
                )}
              >
                <div
                  className={cn(
                    "mb-1 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    isToday ? "bg-primary text-primary-foreground" : dow === 0 ? "text-red-500" : dow === 6 ? "text-blue-500" : "text-foreground"
                  )}
                >
                  {dayNum}
                </div>
                <ul className="w-full space-y-0.5">
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

  // 이미 등록된 운영진 ID 집합
  const existingUserIds = useMemo(() => new Set(items.map((it) => it.user_id)), [items])

  // 수정 모드 — 어떤 항목을 수정 중인지 (없으면 다중 추가 모드)
  const [editingItem, setEditingItem] = useState<StaffAvailabilityWithUser | null>(null)

  // 다중 선택 (새로 추가할 운영진들)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [allDay, setAllDay] = useState(true)
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("12:00")
  const [note, setNote] = useState("")

  // 수정 모드 진입 — 폼 값을 기존 데이터로 prefill
  function enterEditMode(item: StaffAvailabilityWithUser) {
    setEditingItem(item)
    if (item.start_time && item.end_time) {
      setAllDay(false)
      setStartTime(item.start_time.slice(0, 5))
      setEndTime(item.end_time.slice(0, 5))
    } else {
      setAllDay(true)
    }
    setNote(item.note ?? "")
    setSelectedIds(new Set()) // 수정 중에는 다중 선택 초기화
  }

  function exitEditMode() {
    setEditingItem(null)
    setAllDay(true)
    setStartTime("09:00")
    setEndTime("12:00")
    setNote("")
  }

  function handleEditSave() {
    if (!editingItem) return
    if (!allDay && startTime >= endTime) {
      toast.error("종료 시간은 시작 시간보다 뒤여야 합니다.")
      return
    }
    startTransition(async () => {
      const result = await upsertStaffAvailability({
        user_id: editingItem.user_id,
        date,
        start_time: allDay ? null : startTime,
        end_time: allDay ? null : endTime,
        note: note.trim() || null,
      })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("수정했습니다.")
      onClose()
      window.location.reload()
    })
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleBulkSubmit() {
    if (selectedIds.size === 0) {
      toast.error("등록할 운영진을 선택해주세요.")
      return
    }
    if (!allDay && startTime >= endTime) {
      toast.error("종료 시간은 시작 시간보다 뒤여야 합니다.")
      return
    }

    startTransition(async () => {
      const ids = Array.from(selectedIds)
      let okCount = 0
      let failCount = 0
      for (const userId of ids) {
        const result = await upsertStaffAvailability({
          user_id: userId,
          date,
          start_time: allDay ? null : startTime,
          end_time: allDay ? null : endTime,
          note: note.trim() || null,
        })
        if (result.error) failCount++
        else okCount++
      }
      if (failCount > 0) {
        toast.error(`${failCount}명 실패`)
      } else {
        toast.success(`${okCount}명 등록 완료`)
      }
      onClose()
      window.location.reload()
    })
  }

  function handleDeleteEntry(itemId: string) {
    if (!window.confirm("이 출근 등록을 삭제할까요?")) return
    startTransition(async () => {
      const result = await deleteStaffAvailability(itemId)
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
  const availableStaff = staff.filter((s) => !existingUserIds.has(s.id))

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl my-auto"
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

        {/* 이미 등록된 운영진 — 수정/삭제 가능 (수정 모드 진입 시 숨김) */}
        {items.length > 0 && !editingItem && (
          <div className="mb-4 rounded-lg border border-border bg-secondary/30 p-3">
            <p className="mb-2 text-xs font-semibold text-foreground">이미 등록된 출근 ({items.length}명)</p>
            <ul className="space-y-1.5">
              {items.map((it) => {
                const isPermanent = isPermanentStaffId(it.user_id)
                return (
                  <li key={it.id} className="flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-foreground">{it.user?.nickname}</span>
                      {isPermanent && (
                        <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-px text-[9px] font-semibold text-primary">상시</span>
                      )}
                      <span className="ml-2 text-muted-foreground">
                        {it.start_time && it.end_time
                          ? `${formatTime(it.start_time)} ~ ${formatTime(it.end_time)}`
                          : "종일"}
                      </span>
                      {it.registered_by_id && it.registered_by_id !== it.user_id && (
                        <span className="ml-1 text-[10px] text-muted-foreground">
                          ({it.registered_by?.nickname} 등록)
                        </span>
                      )}
                      {it.note && (
                        <p className="mt-0.5 truncate text-muted-foreground">"{it.note}"</p>
                      )}
                    </div>
                    {!isPermanent && (
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => enterEditMode(it)}
                          disabled={pending}
                          className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50"
                          aria-label="수정"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEntry(it.id)}
                          disabled={pending}
                          className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                          aria-label="삭제"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* 수정 모드 — 단일 항목 수정 폼 */}
        {editingItem && (
          <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">
                {editingItem.user?.nickname} 수정 중
              </p>
              <button
                type="button"
                onClick={exitEditMode}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                취소
              </button>
            </div>

            <div className="space-y-1.5">
              <Label>시간</Label>
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
              <Label htmlFor="edit-note">메모 (봉사자에게 보임)</Label>
              <Input
                id="edit-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="예: 산책 위주 봉사 가능"
                maxLength={100}
              />
            </div>
          </div>
        )}

        {/* 다중 추가 폼 (수정 모드 아닐 때) */}
        {!editingItem && availableStaff.length === 0 && (
          <p className="rounded-lg border border-border bg-secondary/20 p-4 text-center text-xs text-muted-foreground">
            모든 운영진이 이미 등록되어 있어요.
          </p>
        )}

        {!editingItem && availableStaff.length > 0 && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>추가할 운영진 (다중 선택)</Label>
              <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-input bg-background/50 p-2">
                {availableStaff.map((s) => {
                  const checked = selectedIds.has(s.id)
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleSelect(s.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                        checked
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-foreground hover:border-primary/40"
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-3.5 shrink-0 items-center justify-center rounded border",
                          checked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
                        )}
                      >
                        {checked && <span className="text-[8px] leading-none">✓</span>}
                      </span>
                      <span className="truncate">
                        {s.nickname}
                        {s.id === currentUserId ? " (나)" : ""}
                      </span>
                    </button>
                  )
                })}
              </div>
              {selectedIds.size > 0 && (
                <p className="text-[11px] text-primary">{selectedIds.size}명 선택됨</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>시간 (선택한 운영진 모두에게 적용)</Label>
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
              <Label htmlFor="add-note">메모 (봉사자에게 보임)</Label>
              <Input
                id="add-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="예: 산책 위주 봉사 가능"
                maxLength={100}
              />
            </div>
          </div>
        )}

        {/* 하단 버튼 */}
        <div className="mt-5 flex items-center justify-end gap-2">
          {editingItem ? (
            <>
              <Button type="button" variant="outline" onClick={exitEditMode} disabled={pending}>
                취소
              </Button>
              <Button type="button" onClick={handleEditSave} disabled={pending}>
                {pending ? "처리 중..." : "저장"}
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
                {availableStaff.length === 0 ? "닫기" : "취소"}
              </Button>
              {availableStaff.length > 0 && (
                <Button
                  type="button"
                  onClick={handleBulkSubmit}
                  disabled={pending || selectedIds.size === 0}
                >
                  {pending
                    ? "처리 중..."
                    : selectedIds.size > 0
                      ? `등록 (${selectedIds.size}명)`
                      : "등록"}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
