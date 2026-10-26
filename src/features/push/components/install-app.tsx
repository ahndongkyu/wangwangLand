"use client"

import { createContext, useContext, useEffect, useRef, useState } from "react"

interface InstallPrompt extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}
const InstallContext = createContext<{ ready: boolean; installed: boolean; ios: boolean; prompt: InstallPrompt | null; clear: () => void }>({ ready: false, installed: false, ios: false, prompt: null, clear: () => {} })

export function InstallAppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState({ ready: false, installed: false, ios: false })
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null)
  useEffect(() => {
    let active = true
    const media = window.matchMedia("(display-mode: standalone)")
    const refresh = () => setState({ ready: true, installed: media.matches || !!(navigator as Navigator & { standalone?: boolean }).standalone, ios: /iPad|iPhone|iPod/.test(navigator.userAgent) || navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1 })
    const capture = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt) }
    const installed = () => { setState((current) => ({ ...current, installed: true })); setPrompt(null) }
    queueMicrotask(() => { if (active) refresh() })
    window.addEventListener("beforeinstallprompt", capture)
    window.addEventListener("appinstalled", installed)
    media.addEventListener("change", refresh)
    return () => { active = false; window.removeEventListener("beforeinstallprompt", capture); window.removeEventListener("appinstalled", installed); media.removeEventListener("change", refresh) }
  }, [])
  return <InstallContext.Provider value={{ ...state, prompt, clear: () => setPrompt(null) }}>{children}</InstallContext.Provider>
}

export function InstallAppButton() {
  const { ready, installed, ios, prompt, clear } = useContext(InstallContext)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState("")
  const busy = useRef(false)
  if (!ready || installed) return null
  async function install() {
    if (!prompt || busy.current) return
    busy.current = true; setPending(true)
    try {
      await prompt.prompt()
      const choice = await prompt.userChoice
      setMessage(choice.outcome === "accepted" ? "설치가 끝나면 홈 화면 또는 앱 목록에서 열어 주세요." : "설치를 취소했습니다. 원할 때 다시 추가할 수 있습니다.")
    } catch { setMessage("설치창을 열지 못했습니다. 아래 브라우저 메뉴 안내를 확인해 주세요.") }
    finally { clear(); busy.current = false; setPending(false) }
  }
  return <details className="rounded-xl border border-border bg-card text-foreground">
    <summary className="min-h-11 cursor-pointer rounded-xl px-4 py-3 text-sm font-medium hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring">홈 화면에 추가</summary>
    <div className="space-y-3 px-4 pb-4 text-sm leading-relaxed">
      <p className="text-muted-foreground">홈 화면에서 왕왕랜드를 바로 열 수 있습니다.</p>
      {prompt && <button type="button" onClick={install} disabled={pending} className="min-h-11 rounded-lg bg-primary px-4 text-primary-foreground disabled:opacity-50">{pending ? "설치 확인 중…" : "앱 설치"}</button>}
      <p>{ios ? "Safari에서 공유 → 홈 화면에 추가를 선택해 주세요." : "브라우저 메뉴의 앱 설치 또는 홈 화면에 추가를 선택해 주세요. PC에서는 주소창의 설치 아이콘도 이용할 수 있습니다."}</p>
      <p className="text-muted-foreground">메뉴가 없다면 Safari 또는 Chrome으로 열어 주세요. 브라우저·기기에 따라 설치를 지원하지 않을 수 있습니다.</p>
      {message && <p role="status">{message}</p>}
    </div>
  </details>
}
