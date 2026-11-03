import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

test("shared search preserves the focused input through query navigation", () => {
  const source = fs.readFileSync("src/shared/components/search-box.tsx", "utf8")
  assert.doesNotMatch(source, /SearchBoxInput key=/)
  assert.match(source, /document\.activeElement !== inputRef\.current/)
  assert.match(source, /router\.replace\([\s\S]*\{ scroll: false \}/)
})

test("admin adoption target search shows debounced matches as the query is typed", () => {
  const source = fs.readFileSync("src/features/applications/components/adoption-processing.tsx", "utf8")
  assert.match(source, /setTimeout\(async\(\)=>[\s\S]*searchAdoptionAnimals\(query\)[\s\S]*,300\)/)
  assert.match(source, /aria-controls="adoption-animal-results"/)
  assert.match(source, /id="adoption-animal-results"/)
  assert.match(source, /setAnimal\(null\)/)
  assert.doesNotMatch(source, /onClick=\{find\}/)
})
