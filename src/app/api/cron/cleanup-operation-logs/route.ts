import { createAdminClient } from "@/shared/lib/supabase/admin"

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new Response(null, { status: 401 })
  try {
    const { error } = await createAdminClient().from("operation_error_logs").delete()
      .lt("last_seen_at", new Date(Date.now() - 90 * 86400000).toISOString())
    return Response.json({ ok: !error }, { status: error ? 503 : 200 })
  } catch { return Response.json({ ok: false }, { status: 503 }) }
}
