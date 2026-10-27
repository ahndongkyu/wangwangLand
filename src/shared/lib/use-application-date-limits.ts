"use client"
import { useEffect, useState } from "react"
import { createClient } from "./supabase/client"

export function useApplicationDateLimits(kind: "volunteer" | "adoption" | undefined, month: string, people: number) {
  const key = `${kind}:${month}:${people}`
  const [result, setResult] = useState<{ key: string; dates: string[]; error: boolean } | null>(null)
  useEffect(() => {
    if (!kind) return
    let active = true
    const [year, m] = month.split("-").map(Number)
    const last = new Date(Date.UTC(year, m, 0)).getUTCDate()
    const refresh = async () => {
      try {
        const { data, error } = await createClient().rpc("application_blocked_dates", {
          p_from: `${month}-01`, p_to: `${month}-${last}`, p_kind: kind, p_people: Number.isInteger(people) && people >= 1 && people <= 30 ? people : 1,
        })
        if (error || !data) throw error
        if (active) setResult({ key, dates: data.map((row: { day: string }) => row.day), error: false })
      } catch { if (active) setResult({ key, dates: [], error: true }) }
    }
    void refresh()
    window.addEventListener("focus", refresh)
    return () => { active = false; window.removeEventListener("focus", refresh) }
  }, [kind, month, people, key])
  return { dates: result?.key === key ? result.dates : [], pending: !!kind && result?.key !== key, error: !!kind && result?.key === key && result.error }
}
