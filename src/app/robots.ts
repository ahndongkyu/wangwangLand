import type { MetadataRoute } from "next"

import { SITE } from "@/shared/constants/site"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // 어드민·내부 API
          "/admin",
          "/admin/",
          "/api/",
          // OAuth 콜백 (일시적 토큰 URL)
          "/auth/",
          // 로그인·가입 흐름
          "/login",
          "/onboarding",
          "/agreement",
          "/pending",
          "/rejected",
          // 개인 페이지 (로그인 필요)
          "/my/",
          "/profile",
        ],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  }
}
