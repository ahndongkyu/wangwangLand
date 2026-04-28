import type { Metadata } from "next"

import { PrivacyContent, PRIVACY_VERSION } from "@/features/legal"

export const metadata: Metadata = {
  title: "개인정보 처리방침",
}

export { PRIVACY_VERSION }

export default function PrivacyPage() {
  return <PrivacyContent />
}
