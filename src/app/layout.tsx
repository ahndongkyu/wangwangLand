import type { Metadata } from "next"
import { Geist_Mono } from "next/font/google"

import { ConfirmProvider } from "@/shared/components/confirm-dialog"
import { ThemeProvider } from "@/shared/components/theme-provider"
import { ToastProvider } from "@/shared/components/toast"
import { SITE } from "@/shared/constants/site"
import "./globals.css"

// 페이지 로드 시 깜빡임 없이 올바른 테마 적용 (hydration 전에 실행)
const themeScript = `(function(){try{if(localStorage.getItem('theme')==='dark'){document.documentElement.classList.add('dark')}}catch(e){}})()`

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: SITE.name,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  keywords: [
    "유기견",
    "유기견 보호소",
    "영종도",
    "인천 유기견",
    "강아지 입양",
    "고양이 입양",
    "유기동물",
    "왕왕랜드",
    "봉사",
    "후원",
  ],
  authors: [{ name: SITE.name }],
  creator: SITE.name,
  publisher: SITE.name,
  icons: {
    icon: SITE.logo,
    shortcut: SITE.logo,
    apple: SITE.logo,
  },
  alternates: {
    types: {
      "application/rss+xml": [{ url: "/feed.xml", title: SITE.name }],
    },
  },
  openGraph: {
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    locale: "ko_KR",
    type: "website",
    url: SITE.url,
    siteName: SITE.name,
    images: [
      {
        url: SITE.ogImage,
        width: 1200,
        height: 630,
        alt: `${SITE.name} — ${SITE.tagline}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    images: [SITE.ogImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
  verification: {
    google: "Ith_3s8bDH8YT_Lje30zM8tw_x6N4bnuvG8lubFJoX8",
    // 네이버 서치어드바이저 — searchadvisor.naver.com 에서 발급받은 토큰 입력.
    // <meta name="naver-site-verification" content="..."> 으로 렌더링됨.
    other: {
      "naver-site-verification": "94658c681822976ad4d95a3fca9e784985fa8abf",
    },
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" className={`${geistMono.variable} h-full`} suppressHydrationWarning>
      <head>
        {/* 테마 깜빡임 방지 — React hydration 전에 실행 */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">
        <ThemeProvider>
          <ToastProvider>
            <ConfirmProvider>{children}</ConfirmProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
