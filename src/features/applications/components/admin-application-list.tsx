import Link from "next/link"
import { Pagination } from "@/shared/components/pagination"
import { formatKoreanPhone } from "@/shared/lib/validation"
import type { AdminApplicationRow } from "../api/admin-queries"
import { applicationDate, applicationHref, applicationParams, type ApplicationFilters } from "../lib/admin-list"
import { ApplicationBadge } from "./application-detail-layout"

const control = "min-h-11 min-w-0 rounded-lg border border-input bg-card px-3 text-base text-foreground focus-visible:outline-2 focus-visible:outline-ring md:text-sm"
const listColumns = "xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_112px_110px_64px]"
export function AdminApplicationList({ filters, rows, counts, total, error, eventsError }: {
  filters: ApplicationFilters; rows: AdminApplicationRow[]; counts: Record<string, number>; total: number; error: string; eventsError: boolean
}) {
  const params = applicationParams(filters)
  const href = (overrides: Record<string, string>) => applicationHref({ ...params, page: "1", ...overrides })
  const returnTo = applicationHref(params)
  const volunteer = filters.type === "volunteer"
  const statuses = volunteer ? ["접수", "검토중", "일정변경요청"] : ["접수", "검토중"]
  return <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
    <header className="mb-6"><p className="mb-2 text-xs text-muted-foreground">신청 관리</p><h1 className="text-2xl font-bold tracking-tight">확인할 신청을 한눈에</h1><p className="mt-2 text-sm text-muted-foreground">접수부터 일정 확정까지 관리합니다.</p></header>
    <nav aria-label="신청 종류" className="mb-5 flex gap-7 border-b border-border">{(["volunteer", "adoption"] as const).map(type => <Link key={type} href={href({ type, status: filters.status === "일정변경요청" ? "처리 필요" : filters.status })} aria-current={filters.type === type ? "page" : undefined} className={`inline-flex min-h-11 items-center border-b-2 pb-3 text-sm ${filters.type === type ? "border-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{type === "volunteer" ? "봉사 신청" : "입양 신청"}</Link>)}</nav>
    <div className={`mb-5 grid gap-2 sm:gap-3 ${volunteer ? "grid-cols-3" : "grid-cols-2"}`}>
      {statuses.map(status => <Link key={status} href={href({ status, q: "", from: "", to: "" })} aria-current={filters.status === status ? "true" : undefined} className={`min-w-0 rounded-xl border bg-card p-3 transition-colors hover:border-primary sm:p-4 ${filters.status === status ? "border-primary ring-1 ring-primary" : "border-border"}`}><span className="text-xs sm:text-sm">{status}</span><strong className="mt-1 block text-2xl font-semibold tabular-nums">{error ? "—" : (counts[status] ?? 0).toLocaleString()}</strong><span className="text-xs text-muted-foreground">전체 기간</span></Link>)}
    </div>
    <form action="/admin/applications" method="get" className="mb-4">
      <input type="hidden" name="type" value={filters.type} /><input type="hidden" name="status" value={filters.status} />
      <div className="grid min-w-0 items-end gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_130px_145px_145px_auto]">
        <label className="min-w-0 text-xs text-muted-foreground"><span className="mb-2 block">{volunteer ? "이름·단체명·전화번호" : "이름·전화번호"}</span><input key={filters.q} name="q" defaultValue={filters.q} placeholder={volunteer ? "이름·단체명·전화번호 검색" : "이름·전화번호 검색"} className={`${control} w-full`} /></label>
        <label className="min-w-0 text-xs text-muted-foreground"><span className="mb-2 block">날짜 기준</span><select key={filters.dateBy} name="dateBy" defaultValue={filters.dateBy} className={`${control} w-full`}><option value="submitted">신청일</option><option value="activity">{volunteer ? "봉사 희망일" : "방문 희망일"}</option></select></label>
        <div className="grid min-w-0 grid-cols-2 gap-2 sm:col-span-2 xl:col-span-2">
          <label className="min-w-0 text-xs text-muted-foreground"><span className="mb-2 block">시작일</span><input key={filters.from} type="date" name="from" defaultValue={filters.from} className={`${control} w-full`} /></label>
          <label className="min-w-0 text-xs text-muted-foreground"><span className="mb-2 block">종료일</span><input key={filters.to} type="date" name="to" defaultValue={filters.to} className={`${control} w-full`} /></label>
        </div>
        <div className="flex gap-2 sm:col-span-2 xl:col-span-1"><button type="submit" className="min-h-11 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-brand-action-hover">검색</button><Link href={href({ from: "", to: "", dateBy: "submitted", q: "" })} className="inline-flex min-h-11 items-center px-3 text-sm text-muted-foreground hover:text-foreground">초기화</Link></div>
      </div>
      {filters.dateBy === "activity" && <p className="mt-2 text-xs leading-5 text-muted-foreground">희망 일정은 시작일·종료일을 모두 선택해야 하며 최대 1년까지 조회합니다.{volunteer ? " 일정변경 요청은 변경 희망일로 조회합니다." : ""}</p>}
    </form>
    <nav aria-label="처리 상태" className="mb-5 flex flex-wrap gap-1.5">{["처리 필요", "전체", ...statuses, "승인", "반려·취소"].map(status => <Link key={status} href={href({ status })} aria-current={status === filters.status ? "true" : undefined} className={`inline-flex min-h-11 items-center rounded-lg px-3 text-xs font-medium transition-colors ${status === filters.status ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>{status}</Link>)}</nav>
    <div className="mb-3 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><p role="status">{filters.status} <strong className="text-foreground">{total.toLocaleString()}건</strong></p><p>{filters.dateBy === "submitted" ? "신청일 기준" : "희망 일정 기준"} · 접수 최신순</p></div>
    {error ? <p role="alert" className="rounded-xl border border-destructive/30 bg-card p-5 text-sm text-destructive">{error}</p> : <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div aria-hidden className={`hidden ${listColumns} gap-4 bg-muted/50 px-5 py-3 text-xs text-muted-foreground xl:grid`}>
        <span>신청정보</span>
        <span>{volunteer ? "희망 일정" : "희망하는 아이 · 방문 일정"}</span>
        <span className="text-center">신청일시</span>
        <span className="text-center">처리 상태</span>
        <span className="text-center">확인</span>
      </div>
      <ul className="divide-y divide-border">{rows.map(row => {
        const v = "party_size" in row ? row : null
        const a = "reason" in row ? row : null
        const dates = v ? (v.status === "일정변경요청" ? v.reschedule_dates ?? [] : v.available_dates) : a?.visit_available_dates ?? []
        const time = v ? (v.status === "일정변경요청" ? v.reschedule_time : v.available_time) : a?.visit_available_time
        const detail = `/admin/applications/${filters.type}/${row.id}?returnTo=${encodeURIComponent(returnTo)}`
        const name = v?.group_name || row.applicant_name
        const fullName = v?.group_name ? `${v.group_name} · 대표 ${row.applicant_name}` : row.applicant_name
        const submitted = new Date(row.submitted_at)
        const submittedTime = Number.isFinite(submitted.getTime())
          ? submitted.toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false })
          : "—"
        const animalName = a?.dog?.name || a?.cat?.name || a?.preferred_animal || "상담 후 결정"
        return <li key={row.id} className={`grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3 p-4 transition-colors hover:bg-muted/40 ${listColumns} xl:items-center xl:gap-4 xl:px-5`}>
          <div className="min-w-0">
            <Link href={detail} title={fullName} aria-label={`${fullName} 신청 상세`} className="block truncate text-sm font-semibold hover:text-primary">{name}</Link>
            {v && <p className="mt-1 flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
              <span title={v.group_name ? `대표 ${row.applicant_name}` : undefined} className="min-w-0 truncate">{v.group_name ? `대표 ${row.applicant_name}` : v.party_size > 1 ? "단체" : "개인"}</span>
              <span className="shrink-0">· {v.party_size}명</span>
            </p>}
            <a href={`tel:${row.phone}`} className="mt-1 inline-flex min-h-6 text-xs text-muted-foreground hover:text-foreground">{formatKoreanPhone(row.phone)}</a>
          </div>
          <div className="col-span-2 col-start-1 row-start-2 min-w-0 xl:col-span-1 xl:col-auto xl:row-auto">
            <p className="mb-1 text-xs text-muted-foreground xl:sr-only">{volunteer ? "희망 일정" : "희망하는 아이 · 방문 일정"}</p>
            {a && <p title={animalName} className="mb-1 truncate text-sm font-medium">{animalName}</p>}
            <p className={`${a ? "text-xs text-muted-foreground" : "text-sm font-medium"} tabular-nums`}>{dates[0] ? applicationDate(dates[0]) : v?.available_days?.length ? `${v.available_days.join(", ")}요일` : "날짜 미입력"} {time || ""}</p>
            {dates.length > 1 && <details className="mt-1 text-xs text-muted-foreground"><summary className="cursor-pointer py-1">외 {dates.length - 1}일 · 전체 날짜</summary><ul className="space-y-1 pt-1">{dates.slice(1).map(date => <li key={date}>{applicationDate(date)} {time}</li>)}</ul></details>}
            {v?.message && <p className="mt-1 text-xs text-muted-foreground">신청 메모 있음</p>}
          </div>
          <div className="col-start-1 row-start-3 min-w-0 text-xs text-muted-foreground xl:col-auto xl:row-auto xl:text-center">
            <p className="mb-1 xl:sr-only">신청일시</p>
            <time dateTime={row.submitted_at} className="tabular-nums"><span className="block">{applicationDate(row.submitted_at)}</span><span className="mt-1 block">{submittedTime}</span></time>
          </div>
          <div className="col-start-2 row-start-1 text-right xl:col-auto xl:row-auto xl:text-center"><ApplicationBadge status={row.status} />{v && <p className={`mt-2 text-xs ${row.status === "승인" && row.linkedCount === 0 ? "font-medium text-primary" : "text-muted-foreground"}`}>{eventsError ? "일정 조회 실패" : row.linkedCount ? `캘린더 등록 ${row.linkedCount}건` : "일정 미등록"}</p>}</div>
          <Link href={detail} aria-label={`${row.applicant_name} 신청 확인`} className="col-start-2 row-start-3 inline-flex min-h-11 items-center justify-center self-end rounded-lg border border-border px-3 text-xs font-medium hover:bg-muted xl:col-auto xl:row-auto xl:self-center">확인</Link>
        </li>
      })}</ul>
      {!rows.length && <div className="p-8 text-center"><p className="text-sm">해당 조건의 신청이 없습니다.</p><Link href={href({ status: "전체", q: "", from: "", to: "" })} className="mt-3 inline-flex min-h-11 items-center text-sm text-primary underline">전체 신청 보기</Link></div>}
    </div>}
    <Pagination currentPage={filters.page} totalPages={Math.max(1, Math.ceil(total / 20))} basePath="/admin/applications" searchParams={params} />
  </div>
}
