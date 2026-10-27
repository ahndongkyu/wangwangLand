export const ADMIN_LIST = {
  surface: "overflow-hidden rounded-xl border border-border bg-card",
  row: "min-h-[60px] px-4 py-3 text-sm transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none",
  header: "border-b border-border bg-muted/40 px-4 py-3 text-xs font-semibold text-muted-foreground",
  control: "min-h-11 rounded-lg border border-input bg-background px-3 text-base md:text-sm",
} as const

/** A failed or uncertain request remains selected; confirmed successes alone disappear. */
export async function deleteSelectedItems(
  ids: string[],
  deleteAction: (id: string) => Promise<{ error?: string }>,
) {
  const succeeded: string[] = []
  const failed: string[] = []
  for (const id of [...new Set(ids)]) {
    try {
      const result = await deleteAction(id)
      if (result.error) failed.push(id)
      else succeeded.push(id)
    } catch { failed.push(id) }
  }
  return { succeeded, failed }
}
