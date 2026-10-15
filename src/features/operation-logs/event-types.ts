export interface OperationEvent {
  id: string; occurred_at: string; actor_id: string | null; actor_role: string; nickname: string | null
  page: string; target_type: string | null; target_id: string | null; action: string | null
  description: string; location: string | null; browser: string; device: string
  release: string | null; trace_id: string; source: "server" | "browser"
}
export type EventResult = { events: OperationEvent[]; hasMore: boolean; error?: never } | { error: string; events?: never; hasMore?: never }
