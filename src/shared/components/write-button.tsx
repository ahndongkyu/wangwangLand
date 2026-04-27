"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { PenSquare } from "lucide-react"

import { createClient } from "@/shared/lib/supabase/client"

interface Props {
  href: string
  label?: string
}

/**
 * 승인된 회원에게만 표시되는 "작성하기" 버튼.
 *
 * 페이지 본체에서 getCurrentProfile()을 호출하면 cookies() 사용으로 페이지가
 * dynamic 으로 강제 전환되어 ISR 캐시가 무용지물이 됨.
 * → 권한 체크를 client component 로 분리해서 페이지는 static 캐싱 유지.
 *
 * 비로그인/미승인/차단 사용자에겐 아무것도 렌더링하지 않음.
 */
export function WriteButton({ href, label = "작성하기" }: Props) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return
      const { data } = await supabase
        .from("profiles")
        .select("status, is_banned")
        .eq("id", session.user.id)
        .maybeSingle()
      if (cancelled) return
      if (data?.status === "approved" && !data.is_banned) setShow(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!show) return null

  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
    >
      <PenSquare className="size-3.5" />
      {label}
    </Link>
  )
}
