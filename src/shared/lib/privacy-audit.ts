import "server-only"
import { createAdminClient } from "@/shared/lib/supabase/admin"
import { recordOperationError } from "@/features/operation-logs/server"

/** 개인정보 본문·연락처·파일명 없이 접근 주체와 대상만 기록한다. */
export async function recordPrivacyAccess(actorId: string, resource: "member" | "volunteer" | "adoption" | "adoption_document", targetId: string, action: "read" | "download" = "read") {
  try {
    const { error } = await createAdminClient().from("privacy_access_logs")
      .insert({ actor_id: actorId, resource, target_id: targetId, action })
    if (error) throw error
  } catch (error) {
    await recordOperationError("query", "privacyAccessAudit", error, "application")
    // 기록할 수 없는 개인정보 조회는 성공으로 처리하지 않는다.
    throw new Error("접근 기록을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.")
  }
}
