import type { NextConfig } from "next"

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  images: {
    // ⚠️ Vercel Hobby 플랜 Image Optimization 한도(5K/30일) 초과로 일시 비활성화.
    //   true 일 때 모든 next/image 가 원본을 그대로 서빙 → 변환 카운트 0.
    //   업로드 시 클라이언트에서 이미 1920px JPG 로 압축하므로 화질·용량 영향 적음.
    //   변환 한도 회복(30일 rolling) 또는 Pro 업그레이드 후 false 로 되돌릴 것.
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
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
