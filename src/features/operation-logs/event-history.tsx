"use client"

import { useState } from "react"
import Link from "next/link"
import { getErrorEvents } from "./event-actions"
import { targetHref, pageLabel } from "./diagnostics"
import type { EventResult } from "./event-types"
import { formatShortDateTime } from "@/shared/lib/utils"

const roles: Record<string, string> = { admin: "관리자", staff: "운영진", member: "회원", anonymous: "비로그인", unknown: "확인 불가" }
const actions: Record<string, string> = { approve: "승인", reject: "거절", complete: "입양 완료", cancel: "취소", upload: "업로드", download: "다운로드", create: "등록", update: "수정", delete: "삭제" }
const control = "inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
export function EventHistory({ logId, initialResult = null }: { logId: string; initialResult?: EventResult | null }) {
  const [result, setResult] = useState<EventResult | null>(initialResult)
  const [page, setPage] = useState(1)
  const [pending, setPending] = useState(false)
  async function load(next: number) {
    setPending(true)
    try { setResult(await getErrorEvents(logId, next)); setPage(next) }
    catch { setResult({ error: "발생 기록을 불러오지 못했습니다. 다시 시도해주세요." }) }
    finally { setPending(false) }
  }
  return <section aria-label="개별 오류 발생 기록" className="mt-4 min-w-0 border-t border-border pt-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="font-medium">개별 발생 기록</h3>
      <button type="button" disabled={pending} onClick={() => load(result ? page : 1)} className={control}>{pending ? "조회 중…" : result ? "새로고침" : "발생 기록 보기"}</button>
    </div>
    <p className="mt-2 text-xs text-muted-foreground">최근 90일 · 브라우저 신고는 동일 회원·화면·오류당 1분에 한 번 기록합니다. 원인 설명은 분류 결과이며 확정 진단과 다를 수 있습니다.</p>
    <div aria-live="polite" aria-busy={pending}>
      {result?.error && <p role="alert" className="mt-3 text-sm text-destructive">{result.error}</p>}
      {result?.events?.length === 0 && <p className="mt-3 text-sm text-muted-foreground">개별 기록이 없습니다. SQL 적용 전 오류는 기존 요약 정보만 남아 있습니다.</p>}
      {result?.events?.map(event => {
        const href = targetHref(event.target_type, event.target_id)
        return <article key={event.id} className="mt-3 min-w-0 rounded-lg border border-border bg-background p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><time dateTime={event.occurred_at} className="tabular-nums">{formatShortDateTime(event.occurred_at)}</time><span className="min-w-0 max-w-full break-words">{roles[event.actor_role] ?? "확인 불가"}{event.nickname ? ` · ${event.nickname}` : event.actor_id ? " · 이름 확인 불가" : ""}</span></div>
          <p className="mt-2 break-words text-sm font-medium">{pageLabel(event.page)}{event.action ? ` → ${actions[event.action] ?? event.action}` : ""}</p>
          <p className="mt-2 break-words text-sm">{event.description}</p>
          <dl className="mt-3 grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] gap-x-2 gap-y-2 text-xs text-muted-foreground [&>dd]:min-w-0 [&>dd]:break-all">
            <dt>화면 경로</dt><dd>{event.page}</dd>
            <dt>사용자 ID</dt><dd>{event.actor_id ?? (event.actor_role === "anonymous" ? "비로그인" : "확인 불가 또는 탈퇴")}</dd>
            <dt>작업 대상</dt><dd>{event.target_type && event.target_id ? `${event.target_type} · ${event.target_id}` : "대상 없음 또는 확인 불가"}</dd>
            <dt>환경</dt><dd>{event.device} · {event.browser} · {event.source === "browser" ? "브라우저 신고(확인 필요)" : "서버 기록"}</dd>
            <dt>발생 위치</dt><dd className="whitespace-pre-wrap">{event.location ?? "수집되지 않음"}</dd>
            <dt>배포 버전</dt><dd>{event.release?.slice(0, 12) ?? "확인 불가"}</dd>
            <dt>추적번호</dt><dd>{event.trace_id}</dd>
          </dl>
          {href && <Link href={href} className="mt-2 inline-flex min-h-11 items-center text-sm text-primary hover:underline">해당 작업 대상으로 이동</Link>}
        </article>
      })}
    </div>
    {result?.events && <nav aria-label="개별 발생 기록 페이지" className="mt-3 flex items-center gap-3">
      <button className={control} disabled={pending || page === 1} onClick={() => load(page - 1)}>이전</button><span className="text-sm">{page}페이지</span><button className={control} disabled={pending || !result.hasMore} onClick={() => load(page + 1)}>다음</button>
    </nav>}
  </section>
}
