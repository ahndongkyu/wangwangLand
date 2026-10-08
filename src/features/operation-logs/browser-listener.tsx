"use client"

import { useEffect } from "react"
import { reportBrowserError } from "./browser"

export function BrowserErrorListener() {
  useEffect(() => {
    const report = () => reportBrowserError("unhandled")
    window.addEventListener("error", report)
    window.addEventListener("unhandledrejection", report)
    return () => {
      window.removeEventListener("error", report)
      window.removeEventListener("unhandledrejection", report)
    }
  }, [])
  return null
}
