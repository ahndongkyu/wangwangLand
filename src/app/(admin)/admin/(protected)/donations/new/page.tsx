import Link from "next/link"

import { AdminDonationForm } from "@/features/donations/components/admin-donation-form"

export const dynamic = "force-dynamic"

export default function AdminDonationNewPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 md:px-6">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/admin/donations" className="hover:text-foreground">
          ← 후원 관리
        </Link>
      </nav>

      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          후원 직접 등록
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          현장 전달·계좌이체 확인 등 직접 접수된 후원을 기록합니다.
        </p>
      </header>

      <AdminDonationForm />
    </div>
  )
}
