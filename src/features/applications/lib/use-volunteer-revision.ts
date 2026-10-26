"use client"

import { useEffect, useState } from "react"
import { getVolunteerRevision } from "../api/volunteer-revision"

export function useVolunteerRevision(id: string, status: string, updatedAt: string | undefined, enabled: boolean) {
  const [stale, setStale] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  useEffect(() => {
    if (!enabled || stale) return
    let active = true
    let checking = false
    async function check() {
      if (!active || checking || document.visibilityState === "hidden") return
      checking = true
      try {
        const result = await getVolunteerRevision(id)
        if (!active) return
        if (result.error) { setUnavailable(true); return }
        setUnavailable(false)
        if (!result.revision || result.revision.status !== status || result.revision.updated_at !== updatedAt) setStale(true)
      } catch { if (active) setUnavailable(true) }
      finally { checking = false }
    }
    const visible = () => { void check() }
    queueMicrotask(visible)
    const timer = setInterval(visible, 15_000)
    window.addEventListener("focus", visible)
    window.addEventListener("online", visible)
    document.addEventListener("visibilitychange", visible)
    return () => { active = false; clearInterval(timer); window.removeEventListener("focus", visible); window.removeEventListener("online", visible); document.removeEventListener("visibilitychange", visible) }
  }, [id, status, updatedAt, enabled, stale])
  return { stale, unavailable, markStale: () => setStale(true), reload: () => window.location.reload() }
}
