import { redirect } from "next/navigation"
import type { Metadata } from "next"
import Link from "next/link"

import { DogCard } from "@/features/dogs/components/dog-card"
import { CatCard } from "@/features/cats/components/cat-card"
import { createClient } from "@/shared/lib/supabase/server"
import type { Dog, Cat } from "@/shared/types/database"

export const metadata: Metadata = { title: "찜한 아이들" }
export const dynamic = "force-dynamic"

export default async function MyLikesPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect("/login")

  const userId = session.user.id

  const { createAdminClient } = await import("@/shared/lib/supabase/admin")
  const admin = createAdminClient()

  const [dogLikesRes, catLikesRes] = await Promise.all([
    admin
      .from("dog_likes")
      .select(
        "dog:dogs(id, name, breed, gender, birth_date, age_months, weight_kg, rescue_date, status, description, personality, health_info, kennel_location, neutered, images, thumbnail_index, view_count, like_count, created_at, updated_at, created_by, size, is_pinned, pin_order)"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    admin
      .from("cat_likes")
      .select(
        "cat:cats(id, name, breed, gender, birth_date, age_months, weight_kg, rescue_date, status, description, personality, health_info, kennel_location, neutered, images, thumbnail_index, view_count, like_count, created_at, updated_at, created_by)"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ])

  const likedDogs = (dogLikesRes.data ?? [])
    .map((r) => (Array.isArray(r.dog) ? r.dog[0] : r.dog))
    .filter(Boolean) as Dog[]

  const likedCats = (catLikesRes.data ?? [])
    .map((r) => (Array.isArray(r.cat) ? r.cat[0] : r.cat))
    .filter(Boolean) as Cat[]

  const isEmpty = likedDogs.length === 0 && likedCats.length === 0

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 md:py-14">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/my" className="hover:text-foreground">
          ← 마이페이지
        </Link>
      </nav>

      <h1 className="mb-6 text-2xl font-bold text-foreground">찜한 아이들</h1>

      {isEmpty ? (
        <div className="rounded-2xl border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          찜한 아이가 없습니다
        </div>
      ) : (
        <>
          {likedDogs.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-4 text-base font-semibold text-foreground">강아지</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {likedDogs.map((dog) => (
                  <DogCard key={dog.id} dog={dog} />
                ))}
              </div>
            </section>
          )}

          {likedCats.length > 0 && (
            <section>
              <h2 className="mb-4 text-base font-semibold text-foreground">고양이</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {likedCats.map((cat) => (
                  <CatCard key={cat.id} cat={cat} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
