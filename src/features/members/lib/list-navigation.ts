export function memberListReturnHref(value?: string | string[]): string {
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw || !raw.startsWith("/admin/members") || raw.includes("\\")) return "/admin/members"
  try {
    const url = new URL(raw, "https://internal.invalid")
    if (url.origin !== "https://internal.invalid" || url.pathname !== "/admin/members") return "/admin/members"
    const query = new URLSearchParams()
    const status = url.searchParams.get("status")
    const sort = url.searchParams.get("sort")
    const page = Number(url.searchParams.get("page"))
    if (status && ["pending", "approved", "rejected"].includes(status)) query.set("status", status)
    if (sort && ["status", "name", "joined"].includes(sort)) query.set("sort", sort)
    if (Number.isSafeInteger(page) && page > 1) query.set("page", String(page))
    const q = url.searchParams.get("q")?.trim()
    if (q) query.set("q", q.slice(0, 100))
    return `/admin/members${query.size ? `?${query}` : ""}`
  } catch { return "/admin/members" }
}
