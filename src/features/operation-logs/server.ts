import "server-only"
import { createAdminClient } from "@/shared/lib/supabase/admin"
import { safeErrorCode, type Operation, type LogArea } from "./catalog"

/** 호출부의 고정 문자열만 step으로 전달한다. 원래 업무 결과에 영향을 주지 않는 최선형 기록. */
export async function recordOperationError(operation: Operation, step: string, error?: unknown, area: LogArea = "admin"): Promise<void> {
  try {
    if (!/^[a-zA-Z][a-zA-Z0-9_. -]{0,79}$/.test(step)) return
    const { error: logError } = await createAdminClient().rpc("record_operation_error", {
      p_operation: operation, p_step: step, p_code: safeErrorCode(error), p_area: area,
    }).abortSignal(AbortSignal.timeout(1500))
    if (logError) console.warn("[operation-log] storage unavailable")
  } catch {
    console.warn("[operation-log] storage unavailable")
  }
}
