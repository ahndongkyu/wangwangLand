import type { Instrumentation } from "next"

export const onRequestError: Instrumentation.onRequestError = async (error, _request, context) => {
  // 클라이언트 입력 URL·헤더·오류 본문은 전달하지 않는다.
  if (process.env.NEXT_RUNTIME !== "nodejs") return
  const { recordOperationError } = await import("@/features/operation-logs/server")
  const { logArea, serverErrorStep } = await import("@/features/operation-logs/catalog")
  await recordOperationError("server", serverErrorStep(context.routeType, context.routePath), error, logArea(context.routePath))
}
