"use client"
import { createContext, useContext, type ReactNode } from "react"
import type { OperatingInfo } from "../lib/operating-info"

const ContactContext = createContext<OperatingInfo["contact"] | null>(null)
export function OperatingProvider({ contact, children }: { contact: OperatingInfo["contact"] | null; children: ReactNode }) {
  return <ContactContext.Provider value={contact}>{children}</ContactContext.Provider>
}
export function useOperatingContact() { return useContext(ContactContext) }
