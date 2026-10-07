"use client"

import { AnimalForm } from "@/features/animals/components/animal-form"
import type { Cat } from "@/shared/types/database"
import { createCat, updateCat } from "../api/mutations"

export function CatForm({ cat }: { cat?: Cat }) {
  return <AnimalForm kind="cats" animal={cat} onSave={data => cat ? updateCat(cat.id, data) : createCat(data)} />
}
