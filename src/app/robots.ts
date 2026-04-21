import type { MetadataRoute } from "next"

import { SITE } from "@/shared/constants/site"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // 어드민·API 내부 경로는 크롤 차단
        disallow: ["/admin", "/admin/", "/api/"],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  }
}
