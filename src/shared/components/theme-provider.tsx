"use client"

import { createContext, useContext, useEffect, useState } from "react"

type Theme = "light" | "dark" | "system"
type ResolvedTheme = "light" | "dark"

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "system"
    const stored = localStorage.getItem("theme")
    return stored === "light" || stored === "dark" ? stored : "system"
  })
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light")

  // 테마 변경 시 html 클래스 + resolvedTheme 업데이트
  useEffect(() => {
    const stored = localStorage.getItem("theme")
    const effectiveTheme =
      theme === "system" && (stored === "light" || stored === "dark")
        ? stored
        : theme
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const apply = () => {
      const dark =
        effectiveTheme === "dark" ||
        (effectiveTheme === "system" && media.matches)
      document.documentElement.classList.toggle("dark", dark)
      setResolvedTheme(dark ? "dark" : "light")
    }

    apply()
    if (effectiveTheme !== "system") return

    media.addEventListener("change", apply)
    return () => media.removeEventListener("change", apply)
  }, [theme])

  const setTheme = (t: Theme) => {
    setThemeState(t)
    if (t === "system") {
      localStorage.removeItem("theme")
    } else {
      localStorage.setItem("theme", t)
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
