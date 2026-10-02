import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import vm from "node:vm"
import ts from "typescript"

function load(file, imports = {}) {
  const exports = {}
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(code, { exports, Date, console, require(name) {
    assert.ok(name in imports, `Unexpected dependency: ${name}`)
    return imports[name]
  } })
  return exports
}

const roles = load("src/shared/lib/member-role.ts")
test("legacy and ordinary members have one label and assignable role", () => {
  for (const role of ["member", "full_member"]) {
    assert.equal(roles.normalizeMemberRole(role), "member")
    assert.equal(roles.MEMBER_ROLE_LABEL[roles.normalizeMemberRole(role)], "회원")
  }
  for (const role of ["staff", "admin"]) assert.equal(roles.normalizeMemberRole(role), role)
  assert.equal(roles.isAssignableMemberRole("full_member"), false)
  assert.equal(roles.isAssignableMemberRole("owner"), false)
  for (const role of ["member", "staff", "admin"]) assert.equal(roles.isAssignableMemberRole(role), true)
})

for (const [file, name, url] of [
  ["src/features/daily/api/user-actions.ts", "createDailyPostAsUser", "/daily/post"],
  ["src/features/stories/api/user-actions.ts", "createStoryAsUser", "/stories/post"],
]) {
  test(`${name}: member and legacy member can write; pending/banned remain blocked`, async () => {
    for (const profile of [
      { role: "member", status: "approved", is_banned: false },
      { role: "full_member", status: "approved", is_banned: false },
      { role: "member", status: "pending", is_banned: false },
      { role: "member", status: "approved", is_banned: true },
    ]) {
      let writes = 0
      const client = {
        auth: { getSession: async () => ({ data: { session: { user: { id: "member" } } } }) },
        from() {
          return { select() { return this }, eq() { return this }, maybeSingle: async () => ({ data: profile }), insert() { writes++; return this }, single: async () => ({ data: { id: "post" } }) }
        },
      }
      const api = load(file, {
        "next/cache": { revalidatePath() {} },
        "next/navigation": { redirect(path) { throw Error(`redirect:${path}`) } },
        "@/shared/lib/supabase/server": { createClient: async () => client },
      })
      const form = new FormData()
      form.set("title", "기록")
      form.set("content", "내용")
      form.set("images", "https://example.com/test.jpg")
      if (profile.status === "approved" && !profile.is_banned) {
        await assert.rejects(api[name]({}, form), new RegExp(`redirect:${url}`))
        assert.equal(writes, 1)
      } else {
        assert.ok((await api[name]({}, form)).error)
        assert.equal(writes, 0)
      }
    }
  })
}

test("role mutations cannot recreate full_member or run as an ordinary member", async () => {
  for (const authorized of [true, false]) {
    const api = load("src/features/members/api/actions.ts", {
      "@vercel/blob": {}, "next/cache": {}, "next/navigation": {},
      "@/shared/lib/auth": { requireAdmin: async () => authorized ? { ok: true, role: "admin" } : { ok: false, error: "권한 없음" } },
      "@/shared/lib/member-role": roles,
      "@/shared/lib/supabase/server": {}, "@/shared/lib/supabase/service": {},
      "@/shared/lib/validation": {}, "@/shared/constants/home-navigation": {},
    })
    for (const name of ["approveMember", "updateMemberRole"]) {
      const result = await api[name]("member", authorized ? "full_member" : "member")
      assert.match(result.error, authorized ? /올바르지 않은/ : /권한 없음/)
    }
  }
})

test("ranking pages and tier implementation are removed", () => {
  for (const file of ["src/app/(public)/ranking/page.tsx", "src/app/(admin)/admin/(protected)/ranking/page.tsx", "src/features/volunteer-tier/tier.ts"]) assert.equal(fs.existsSync(file), false)
  const myPage = fs.readFileSync("src/app/(public)/my/page.tsx", "utf8")
  assert.doesNotMatch(myPage, /\/ranking|정회원|일반 회원/)
  assert.match(myPage, /지난 승인 신청 기록/)
})
