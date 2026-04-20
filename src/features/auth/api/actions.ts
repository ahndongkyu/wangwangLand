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
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: "이메일 또는 비밀번호가 올바르지 않습니다." }
  }

  // 운영진 테이블에 등록된 계정인지 확인
  const { data: admin } = await supabase
    .from("admins")
    .select("id")
    .maybeSingle()

  if (!admin) {
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
