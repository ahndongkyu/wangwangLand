// 클라이언트·서버 공용 타입. 서버 의존성(next/headers, supabase 서버 클라) 포함 금지.

export interface RecentNoticeMeta {
  id: string
  published_at: string
  is_pinned: boolean
}
