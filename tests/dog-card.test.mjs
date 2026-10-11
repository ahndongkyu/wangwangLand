import test from "node:test"
import assert from "node:assert/strict"
import { load } from "./helpers/page-review-fixtures.mjs"

const { DogCard } = load("src/features/dogs/components/dog-card.tsx", {
  "next/image": { default: "img" },
  "next/link": { default: "a" },
  "@/shared/lib/age": { formatAge: () => "2살" },
  "@/shared/constants/site": { SITE: { headerLogo: "/logo.png" } },
})
const dog = { id: "test", name: "아주긴이름의아이", status: "임시보호중", images: ["/photo.jpg"], thumbnail_index: 0, gender: "여아", size: "소", breed: "믹스" }
function nodes(node) {
  if (!node || typeof node !== "object") return []
  if (Array.isArray(node)) return node.flatMap(nodes)
  return [node, ...nodes(node.props?.children)]
}
test("home status sits beside the name outside the photo and allows wrapping", () => {
  for (const images of [dog.images, []]) {
    const card = DogCard({ dog: { ...dog, images }, variant: "home" })
    const [photo, content] = card.props.children
    assert.equal(nodes(photo).some(n => n.props?.children === dog.status), false)
    const headingRow = content.props.children[0]
    assert.match(headingRow.props.className, /flex-wrap/)
    assert.equal(nodes(headingRow).filter(n => n.props?.children === dog.status).length, 1)
    assert.match(nodes(headingRow).find(n => n.type === "h3").props.className, /break-words/)
    assert.match(nodes(headingRow).find(n => n.type === "span").props.className, /whitespace-nowrap/)
    assert.equal(card.props.href, "/dogs/test")
  }
})
test("default list card retains photo status and breed information", () => {
  const card = DogCard({ dog })
  const [photo, content] = card.props.children
  assert.equal(nodes(photo).filter(n => n.props?.children === dog.status).length, 1)
  assert.equal(nodes(content).some(n => n.props?.children === dog.status), false)
  assert.ok(nodes(content).some(n => n.props?.children === dog.breed))
})
