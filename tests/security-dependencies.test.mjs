import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import { MockAgent, getGlobalDispatcher, setGlobalDispatcher } from "undici"
import { put, get } from "@vercel/blob"
import postcss from "postcss"
import tailwind from "@tailwindcss/postcss"
import { Receiver, Sender } from "ws"
import { once } from "node:events"

test("unnecessary CLI servers are absent and runtime transports are patched", () => {
  const { packages } = JSON.parse(fs.readFileSync("package-lock.json", "utf8"))
  for (const name of ["shadcn", "@modelcontextprotocol/sdk", "express", "proxy-addr", "hono"]) {
    assert.equal(Object.keys(packages).some(key => key.endsWith(`node_modules/${name}`)), false, name)
  }
  for (const [name, minimum] of [["undici", "6.28.1"], ["ws", "8.21.0"]]) {
    const versions = Object.entries(packages).filter(([key]) => key.endsWith(`node_modules/${name}`))
    assert.ok(versions.length)
    for (const [, pkg] of versions) {
      assert.ok(pkg.version.localeCompare(minimum, "en", { numeric: true }) >= 0)
    }
  }
  for (const name of ["braces", "micromatch", "fast-glob", "eslint-config-next", "@next/eslint-plugin-next"]) {
    assert.equal(packages[`node_modules/${name}`].dev, true, `${name} must remain dev-only`)
  }
})

test("local component utilities compile open/closed/checked states and scrollbar styles", async () => {
  const css = '@import "tailwindcss";\n@import "./component-utilities.css";\n@source inline("data-open:bg-red-500 data-closed:opacity-0 data-checked:bg-red-500 no-scrollbar");'
  const result = await postcss([tailwind({ optimize: false })]).process(css, { from: "src/app/globals.css" })
  assert.match(result.css, /data-open/)
  assert.match(result.css, /data-state="open"/)
  assert.match(result.css, /data-state="closed"/)
  assert.match(result.css, /data-state="checked"/)
  assert.match(result.css, /scrollbar-width: none/)
  assert.doesNotMatch(fs.readFileSync("src/app/globals.css", "utf8"), /shadcn\/tailwind/)
})

test("patched WebSocket transport preserves masked UTF-8 messages", async () => {
  const receiver = new Receiver({ isServer: true, maxPayload: 1024 })
  const received = once(receiver, "message")
  const payload = Buffer.from("봉사 일정 업데이트")
  for (const frame of Sender.frame(payload, { fin: true, opcode: 1, mask: true, rsv1: false, readOnly: true })) {
    receiver.write(frame)
  }
  const [data, isBinary] = await received
  assert.equal(data.toString(), payload.toString())
  assert.equal(isBinary, false)
  receiver.end()
})

test("patched transport supports private Blob upload/download and denies failed downloads", async () => {
  const previous = getGlobalDispatcher()
  const mock = new MockAgent()
  mock.disableNetConnect()
  setGlobalDispatcher(mock)
  const token = "vercel_blob_rw_teststore_test-only"
  const origin = "https://teststore.private.blob.vercel-storage.com"
  const content = "%PDF-1.7 test document"
  try {
    mock.get("https://vercel.com").intercept({
      path: "/api/blob/?pathname=security-test.pdf", method: "PUT",
      headers: { authorization: `Bearer ${token}` },
    }).reply(200, {
      url: `${origin}/security-test.pdf`, pathname: "security-test.pdf",
      downloadUrl: `${origin}/security-test.pdf?download=1`, contentType: "application/pdf",
    })
    const uploaded = await put("security-test.pdf", content, { access: "private", token, contentType: "application/pdf" })
    assert.equal(uploaded.pathname, "security-test.pdf")
    mock.get(origin).intercept({ path: "/security-test.pdf", method: "GET", headers: { authorization: `Bearer ${token}` } })
      .reply(200, content, { headers: { "content-type": "application/pdf", "content-length": String(Buffer.byteLength(content)) } })
    const downloaded = await get(uploaded.url, { access: "private", token })
    assert.equal(downloaded.statusCode, 200)
    assert.equal(await new Response(downloaded.stream).text(), content)
    mock.get(origin).intercept({ path: "/denied.pdf", method: "GET" }).reply(403, "Forbidden")
    await assert.rejects(get(`${origin}/denied.pdf`, { access: "private", token }), /403/)
    mock.assertNoPendingInterceptors()
  } finally {
    setGlobalDispatcher(previous)
    await mock.close()
  }
})
