"use client"

import { useRef, useState } from "react"
import { diagnoseTestSmsDelivery, type SmsDiagnosticResult } from "./diagnose"

export function SmsDiagnosticPanel() {
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<SmsDiagnosticResult | null>(null)
  const running = useRef(false)
  const lastRun = useRef(0)
  async function run() {
    if (running.current) return
    if (Date.now() - lastRun.current < 30000) {
      setResult({ error: "잠시 후 다시 조회해주세요. 진단은 30초 간격으로 실행할 수 있습니다." })
      return
    }
    running.current = true
    lastRun.current = Date.now()
    setPending(true)
    setResult(null)
    try { setResult(await diagnoseTestSmsDelivery()) }
    catch { setResult({ error: "진단 결과를 불러오지 못했습니다. 문자 발송은 수행하지 않았습니다." }) }
    finally { running.current = false; setPending(false) }
  }
  return <details className="mt-6 rounded-xl border border-border bg-card p-4">
    <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring">전달 결과 조회 진단 · 임시</summary>
    <p className="my-3 text-sm text-muted-foreground">기존 테스트 문자 2건만 일괄·단건으로 비교합니다. 문자 발송이나 DB 변경은 하지 않습니다. 상태코드 4000이 실제 반환된 경우에만 전달 완료로 판단합니다.</p>
    <button type="button" onClick={run} disabled={pending} className="min-h-11 rounded-lg border border-border px-4 text-sm transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-wait disabled:opacity-60">
      {pending ? "조회 응답 비교 중…" : "테스트 2건 조회 비교"}
    </button>
    <div aria-live="polite" aria-busy={pending}>
      {pending && <p className="mt-3 text-sm text-muted-foreground">최대 약 10초가 걸릴 수 있습니다.</p>}
      {result?.error && <p role="alert" className="mt-3 text-sm text-destructive">{result.error}</p>}
      {result?.checkedAt && <p className="mt-3 break-all text-xs text-muted-foreground">진단 시각 (UTC): {result.checkedAt}</p>}
      {result?.rows?.map(row => <section key={row.label} className="mt-3 rounded-lg border border-border p-3 text-sm">
        <h2 className="font-medium">{row.label}</h2>
        <p className="mt-2 break-words">HTTP {row.httpStatus ?? "응답 없음"} · 목록 형식 {row.listShape} · 반환 {row.returnedCount}건 · 다음 페이지 {row.hasNextPage ? "있음" : "없음"}</p>
        {row.error && <p className="mt-2 text-destructive">{row.error}</p>}
        {row.matches.map(match => <p key={match.label} className="mt-2 break-words text-muted-foreground">{match.label} — 객체 키 일치: {match.keyMatched ? "예" : "아니오"} / 상태 {match.keyStatus ?? "없음"} · 내부 ID 일치: {match.fieldMatched ? "예" : "아니오"} / 상태 {match.fieldStatus ?? "없음"}</p>)}
      </section>)}
    </div>
  </details>
}
