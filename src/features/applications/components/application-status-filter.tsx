"use client"

export function ApplicationStatusFilter({ value, statuses, className }: {
  value: string
  statuses: string[]
  className: string
}) {
  return <select aria-label="처리 상태" name="status" defaultValue={value} key={value} className={className} onChange={event => event.currentTarget.form?.requestSubmit()}>
    {["처리 필요", "전체", ...statuses, "승인", "반려·취소"].map(status => <option key={status}>{status}</option>)}
  </select>
}
