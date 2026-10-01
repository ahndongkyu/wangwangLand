import type { Metadata } from "next"

import { TermsContent } from "@/features/legal"

export const metadata: Metadata = {
  title: "이용약관",
}

export default function TermsPage() {
  return <TermsContent />
}
