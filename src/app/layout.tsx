import type { Metadata } from "next"
import { Geist_Mono } from "next/font/google"

import { SITE } from "@/shared/constants/site"
import "./globals.css"

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: {
    default: SITE.name,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  icons: {
    icon: SITE.logo,
    shortcut: SITE.logo,
    apple: SITE.logo,
  },
  openGraph: {
    title: SITE.name,
    description: SITE.description,
    locale: "ko_KR",
    type: "website",
    images: [SITE.logo],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" className={`${geistMono.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  )
}
