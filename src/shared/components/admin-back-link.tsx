"use client"

import Link from "next/link"

export function AdminBackLink({ href, children = "목록으로" }: { href: string; children?: React.ReactNode }) {
  return <Link href={href} className="mb-4 inline-flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground">← {children}</Link>
}
