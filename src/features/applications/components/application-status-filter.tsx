"use client"

export function ApplicationStatusFilter({ value, statuses, className, adoption = false }: {
  value: string
  statuses: string[]
  className: string
  adoption?: boolean
}) {
  return <select aria-label="처리 상태" name="status" defaultValue={value} key={value} className={className} onChange={event => event.currentTarget.form?.requestSubmit()}>
    {["처리 필요", ...(value === "승인 대기" ? ["승인 대기"] : []), "전체", ...statuses, "승인", "반려·취소"].map(status => <option key={status} value={status}>{adoption ? status === "접수" ? "승인대기" : status === "검토중" ? "승인대기(검토중)" : status === "반려·취소" ? "거절·취소" : status : status}</option>)}
  </select>
}
