import { Footer } from "@/shared/components/layout/footer"
import { Header } from "@/shared/components/layout/header"
import { ScrollButtons } from "@/shared/components/scroll-buttons"

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <ScrollButtons />
    </div>
  )
}
