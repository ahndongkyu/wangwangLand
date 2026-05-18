import type { NextConfig } from "next"

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "wangwang-land.vercel.app" }],
        destination: "https://wangwangland.kr/:path*",
        permanent: true,
      },
    ]
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  images: {
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
      // Vercel Blob (프로필 사진 등)
      {
        protocol: "https" as const,
        hostname: "*.public.blob.vercel-storage.com",
        pathname: "/**",
      },
      // 카카오 CDN (카카오 로그인 프로필 사진)
      {
        protocol: "https" as const,
        hostname: "*.kakaocdn.net",
        pathname: "/**",
      },
      {
        protocol: "http" as const,
        hostname: "*.kakaocdn.net",
        pathname: "/**",
      },
      // 구글 CDN (구글 로그인 프로필 사진)
      {
        protocol: "https" as const,
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
    ],
  },
}

export default nextConfig
