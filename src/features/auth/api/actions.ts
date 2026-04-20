"use server"

import { redirect } from "next/navigation"

import { createClient } from "@/shared/lib/supabase/server"

export interface AuthResult {
  error?: string
}

export async function login(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")

  if (!email || !password) {
    return { error: "이메일과 비밀번호를 모두 입력해주세요." }
  }

  const supabase = await createClient()
  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({ email, password })

  if (signInError || !signInData.user) {
    return { error: "이메일 또는 비밀번호가 올바르지 않습니다." }
  }

  const userId = signInData.user.id

  const { data: admin, error: adminError } = await supabase
    .from("admins")
    .select("id, role")
    .eq("user_id", userId)
    .maybeSingle()

  if (adminError) {
    console.error("[login] admin lookup error:", adminError, "userId:", userId)
    await supabase.auth.signOut()
    return {
      error: `권한 확인 중 오류: ${adminError.message}`,
    }
  }

  if (!admin) {
    console.error(
      "[login] no admin record for user",
      userId,
      "email:",
      signInData.user.email
    )
    await supabase.auth.signOut()
    return { error: "운영진 권한이 없는 계정입니다." }
  }

  redirect("/admin")
}

export async function logout(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/admin/login")
}
