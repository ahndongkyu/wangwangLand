import { createClient } from "@/shared/lib/supabase/server"
import { Badge } from "@/shared/components/ui/badge"

export const dynamic = "force-dynamic"

async function getRecentApplications() {
  const supabase = await createClient()

  const [adoptions, volunteers] = await Promise.all([
    supabase
      .from("adoption_applications")
      .select("id, applicant_name, phone, status, submitted_at, dog_id")
      .order("submitted_at", { ascending: false })
      .limit(20),
    supabase
      .from("volunteer_applications")
      .select("id, applicant_name, phone, status, submitted_at, activities")
      .order("submitted_at", { ascending: false })
      .limit(20),
  ])

  return {
    adoptions: adoptions.data ?? [],
    volunteers: volunteers.data ?? [],
  }
}

export default async function AdminApplicationsPage() {
  const { adoptions, volunteers } = await getRecentApplications()

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          신청 관리
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          최근 입양·봉사 신청 내역 (상태 변경 기능은 곧 추가됩니다)
        </p>
      </header>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          입양 신청 ({adoptions.length})
        </h2>
        {adoptions.length === 0 ? (
          <EmptyState message="아직 접수된 입양 신청이 없습니다." />
        ) : (
          <ApplicationTable>
            {adoptions.map((a) => (
              <tr key={a.id} className="border-b border-border last:border-0">
                <Td>{a.applicant_name}</Td>
                <Td>{a.phone}</Td>
                <Td>
                  <Badge variant="secondary">{a.status}</Badge>
                </Td>
                <Td className="text-sm text-muted-foreground">
                  {new Date(a.submitted_at).toLocaleString("ko-KR")}
                </Td>
              </tr>
            ))}
          </ApplicationTable>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          봉사 신청 ({volunteers.length})
        </h2>
        {volunteers.length === 0 ? (
          <EmptyState message="아직 접수된 봉사 신청이 없습니다." />
        ) : (
          <ApplicationTable>
            {volunteers.map((v) => (
              <tr key={v.id} className="border-b border-border last:border-0">
                <Td>{v.applicant_name}</Td>
                <Td>{v.phone}</Td>
                <Td>
                  <Badge variant="secondary">{v.status}</Badge>
                </Td>
                <Td className="text-sm text-muted-foreground">
                  {new Date(v.submitted_at).toLocaleString("ko-KR")}
                </Td>
              </tr>
            ))}
          </ApplicationTable>
        )}
      </section>
    </div>
  )
}

function ApplicationTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <table className="w-full">
        <thead className="border-b border-border bg-secondary/40 text-left text-sm">
          <tr>
            <th className="px-4 py-3 font-semibold">이름</th>
            <th className="px-4 py-3 font-semibold">연락처</th>
            <th className="px-4 py-3 font-semibold">상태</th>
            <th className="px-4 py-3 font-semibold">신청일시</th>
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

function Td({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <td className={`px-4 py-3 ${className ?? ""}`}>{children}</td>
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      {message}
    </div>
  )
}
