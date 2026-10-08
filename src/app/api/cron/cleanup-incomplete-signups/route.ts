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

  // 인증 계정 삭제 실패 시 프로필은 보존한다. CASCADE 여부와 관계없이
  // 잔여 프로필 정리까지 성공한 경우만 완료로 집계한다.
  const results = await Promise.allSettled(
    targets.map(async (t) => {
      const { error: authError } = await admin.auth.admin.deleteUser(t.id)
      if (authError) throw authError
      const { error: profileError } = await admin.from("profiles").delete().eq("id", t.id)
      if (profileError) throw profileError
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
    ok: failed.length === 0,
    deleted: succeeded,
    failed: failed.length,
    cutoff,
    cutoffDays: CUTOFF_DAYS,
  })
}
