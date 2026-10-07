"use client"

import { AnimalForm } from "@/features/animals/components/animal-form"
import type { Dog } from "@/shared/types/database"
import { createDog, updateDog } from "../api/mutations"

export function DogForm({ dog }: { dog?: Dog }) {
  return <AnimalForm kind="dogs" animal={dog} onSave={data => dog ? updateDog(dog.id, data) : createDog(data)} />
}
