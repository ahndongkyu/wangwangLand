import type { Metadata } from "next"

import { TermsContent, TERMS_VERSION } from "@/features/legal"

export const metadata: Metadata = {
  title: "이용약관",
}

// 카카오 콜백 등 외부에서 import 가능하도록 re-export
export { TERMS_VERSION }

export default function TermsPage() {
  return <TermsContent />
}
