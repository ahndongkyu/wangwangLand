import type { NextConfig } from "next"

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    // 변환 결과 캐시 30일 유지 (기본 60s) → 같은 이미지 반복 변환 방지
    minimumCacheTTL: 60 * 60 * 24 * 30,
    // 너비 후보 축소 → 변환 카운트 절반 감소 (기본 8개 → 4개)
    deviceSizes: [640, 828, 1200, 1920],
    imageSizes: [64, 128, 256],
    remotePatterns: [
      ...(supabaseHost
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHost,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
    ],
  },
}

export default nextConfig
