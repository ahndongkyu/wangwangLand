import { NextResponse } from "next/server"
import { createAdminClient } from "@/shared/lib/supabase/admin"

/**
 * 가입 미완료 회원 자동 정리
 *
 * 조건: terms_agreed_at IS NULL AND created_at < now() - 4 days
 * 동작: auth.users 를 삭제 → profiles 도 CASCADE 로 함께 삭제
 *
 * 호출 경로: Vercel Cron (또는 외부 cron-job.org)
 * 보안: Vercel Cron 은 자동으로 Authorization 헤더에 CRON_SECRET 을 실어 보냄
 *       외부에서 호출 시도 시 401 반환
 */

const CUTOFF_DAYS = 4

export async function GET(request: Request) {
  // 1. 보안 확인
  const auth = request.headers.get("authorization")
  const expected = `Bearer ${process.env.CRON_SECRET}`
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()
  const cutoff = new Date(
    Date.now() - CUTOFF_DAYS * 24 * 60 * 60 * 1000
  ).toISOString()

  // 2. 정리 대상 조회
  const { data: targets, error: queryErr } = await admin
    .from("profiles")
    .select("id, nickname, created_at")
    .is("terms_agreed_at", null)
    .lt("created_at", cutoff)

  if (queryErr) {
    console.error("[cleanup-incomplete-signups] query failed", queryErr)
    return NextResponse.json({ error: queryErr.message }, { status: 500 })
  }

  if (!targets || targets.length === 0) {
    return NextResponse.json({ ok: true, deleted: 0, message: "정리 대상 없음" })
  }

  // 3. profile 행 + auth.users 명시적으로 삭제
  //    (FK CASCADE 설정 불확실하므로 둘 다 삭제. profile FK 가 set null/cascade 어느 쪽이든 안전)
  const results = await Promise.allSettled(
    targets.map(async (t) => {
      await admin.from("profiles").delete().eq("id", t.id)
      await admin.auth.admin.deleteUser(t.id)
    })
  )

  const succeeded = results.filter((r) => r.status === "fulfilled").length
  const failed = results
    .map((r, i) => ({ r, id: targets[i].id, nickname: targets[i].nickname }))
    .filter(({ r }) => r.status === "rejected")

  if (failed.length > 0) {
    console.error(
      "[cleanup-incomplete-signups] partial failure:",
      failed.map((f) => ({ id: f.id, nickname: f.nickname, reason: (f.r as PromiseRejectedResult).reason }))
    )
  }

  return NextResponse.json({
    ok: true,
    deleted: succeeded,
    failed: failed.length,
    cutoff,
    cutoffDays: CUTOFF_DAYS,
  })
}
