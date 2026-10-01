import type { Metadata } from "next"

import { PrivacyContent } from "@/features/legal"

export const metadata: Metadata = {
  title: "개인정보 처리방침",
}

export default function PrivacyPage() {
  return <PrivacyContent />
}
