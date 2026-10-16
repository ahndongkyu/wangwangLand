import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import { mergeAttributes, getSchema } from "@tiptap/core"
import StarterKit from "@tiptap/starter-kit"
import { ImageResize } from "tiptap-extension-resize-image"
import Link from "@tiptap/extension-link"
import Underline from "@tiptap/extension-underline"
import TextAlign from "@tiptap/extension-text-align"
import Color from "@tiptap/extension-color"
import { TextStyle } from "@tiptap/extension-text-style"

test("editor packages use one consistent patched release and patched paste handler", () => {
  const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"))
  const versions = new Set(Object.entries(lock.packages).filter(([key]) => key.includes("node_modules/@tiptap/")).map(([, value]) => value.version))
  assert.deepEqual([...versions], ["3.32.0"])
  assert.equal(lock.packages["node_modules/next"].version, "16.4.2")
  assert.equal(lock.packages["node_modules/eslint-config-next"].version, "16.4.2")
  assert.equal(lock.packages["node_modules/prosemirror-view"].version, "1.42.6")
})

test("Tiptap does not inherit executable attributes through __proto__", () => {
  const result = mergeAttributes(JSON.parse('{"__proto__":{"onclick":"alert(1)"},"class":"safe"}'))
  assert.equal(Object.getPrototypeOf(result), Object.prototype)
  assert.equal(result.onclick, undefined)
  assert.equal(result.class, "safe")
})

test("updated editor schema preserves text, link and resizable image content", () => {
  const schema = getSchema([StarterKit.configure({ link: false, underline: false }), Link, Underline, ImageResize.configure({ inline: false }), TextAlign.configure({ types: ["heading", "paragraph"] }), TextStyle, Color])
  const document = { type: "doc", content: [
    { type: "paragraph", attrs: { textAlign: "center" }, content: [{ type: "text", text: "보호소 소식", marks: [{ type: "bold" }, { type: "underline" }, { type: "link", attrs: { href: "https://example.test", target: "_blank", rel: "noopener noreferrer" } }] }] },
    { type: "imageResize", attrs: { src: "/images/wangwang-symbol-180.png", alt: "아이들", width: 160, containerStyle: "width: 160px; height: auto;" } },
  ] }
  const parsed = schema.nodeFromJSON(document)
  parsed.check()
  assert.equal(parsed.textContent, "보호소 소식")
  assert.equal(parsed.child(0).attrs.textAlign, "center")
  assert.equal(parsed.child(1).attrs.src, document.content[1].attrs.src)
  assert.equal(parsed.child(1).attrs.width, 160)
  assert.equal(parsed.child(1).attrs.containerStyle, document.content[1].attrs.containerStyle)
})
