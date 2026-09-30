import Link from "next/link"
import { createClient } from "@/shared/lib/supabase/server"

export const dynamic = "force-dynamic"

export default async function ExpensesLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return (
      <div className="mx-auto flex min-h-80 max-w-xl items-center justify-center px-4 py-12">
        <section className="w-full rounded-2xl border border-border bg-card p-8 text-center">
          <h1 className="text-xl font-bold">로그인 후 이용 가능합니다.</h1>
          <p className="mt-3 text-sm text-muted-foreground">지출 내역은 회원에게 공개됩니다.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/login" className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">로그인</Link>
            <Link href="/" className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold">홈으로</Link>
          </div>
        </section>
      </div>
    )
  }
  return children
}
