"use client"

import { useEffect } from "react"
import { reportBrowserError } from "./browser"

export function BrowserErrorListener() {
  useEffect(() => {
    const report = (event: Event) => reportBrowserError("unhandled", event instanceof ErrorEvent ? event.error : event instanceof PromiseRejectionEvent ? event.reason : undefined)
    window.addEventListener("error", report)
    window.addEventListener("unhandledrejection", report)
    return () => {
      window.removeEventListener("error", report)
      window.removeEventListener("unhandledrejection", report)
    }
  }, [])
  return null
}
