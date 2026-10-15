import "server-only"
import { createAdminClient } from "@/shared/lib/supabase/admin"
import { type Operation, type LogArea } from "./catalog"
import { diagnostic, safeContext, type ErrorContext } from "./diagnostics"
import { requestLogContext } from "./request-context"

/** 호출부의 고정 문자열만 step으로 전달한다. 원래 업무 결과에 영향을 주지 않는 최선형 기록. */
export async function recordOperationError(operation: Operation, step: string, error?: unknown, area: LogArea = "admin", context: ErrorContext = {}): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    if (!/^[a-zA-Z][a-zA-Z0-9_. -]{0,79}$/.test(step)) return
    const request = await Promise.race([
      requestLogContext().catch(() => null),
      new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), 800) }),
    ])
    const detail = diagnostic(error, step)
    const traceId = crypto.randomUUID()
    const safe = safeContext(context)
    const release = process.env.VERCEL_GIT_COMMIT_SHA
    const { error: logError } = await createAdminClient().rpc("record_operation_error_event", {
      p_operation: operation, p_step: step, p_code: detail.code, p_area: area,
      p_context: { ...safe, page: safe.page === "unknown" ? request?.page ?? "unknown" : safe.page,
        actor_id: request?.actor_id ?? null, actor_state: request?.actor_state ?? "unknown", browser: request?.browser ?? "unknown", device: request?.device ?? "unknown",
        trace_id: traceId, release: release && /^[0-9a-f]{40}$/i.test(release) ? release : null,
        description: detail.description, location: detail.location },
    }).abortSignal(AbortSignal.timeout(1500))
    console.warn(`[operation-error] ${traceId} ${operation}.${step} ${detail.code}`)
    if (logError) {
      // SQL 배포 전에는 기존 집계라도 유지한다. 이행 기간 외 DB 오류는 재시도하지 않는다.
      if (["PGRST202", "42883"].includes(logError.code)) await createAdminClient().rpc("record_operation_error", {
        p_operation: operation, p_step: step, p_code: detail.code.slice(0, 24), p_area: area,
      }).abortSignal(AbortSignal.timeout(1000))
      console.warn("[operation-log] detail storage unavailable")
    }
  } catch {
    console.warn("[operation-log] storage unavailable")
  } finally { if (timer) clearTimeout(timer) }
}
