export const NEW_POST_WINDOW_MS = 48 * 60 * 60 * 1000

export function isRecentPost(date: string, now: number): boolean {
  const published = Date.parse(date)
  return Number.isFinite(published) && published <= now && now < published + NEW_POST_WINDOW_MS
}
