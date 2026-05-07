/**
 * Supabase Storage → Vercel Blob 이미지 마이그레이션 스크립트
 *
 * 실행: node scripts/migrate-images.mjs
 *
 * 처리 대상:
 *   - notices.images[], notices.content (본문 img src)
 *   - daily_posts.images[], daily_posts.content
 *   - adoption_stories.images[], adoption_stories.content
 *   - dogs.images[]
 *   - cats.images[]
 */

import { createClient } from "@supabase/supabase-js"
import { put } from "@vercel/blob"
import { readFileSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))

// .env.local 파싱
function loadEnv() {
  const envPath = resolve(__dirname, "../.env.local")
  const lines = readFileSync(envPath, "utf-8").split("\n")
  for (const line of lines) {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const val = match[2].trim().replace(/^["']|["']$/g, "")
      process.env[key] = process.env[key] ?? val
    }
  }
}
loadEnv()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !BLOB_TOKEN) {
  console.error("❌ 환경변수 누락:", { SUPABASE_URL: !!SUPABASE_URL, SUPABASE_SERVICE_KEY: !!SUPABASE_SERVICE_KEY, BLOB_TOKEN: !!BLOB_TOKEN })
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Supabase Storage URL인지 확인
function isSupabaseUrl(url) {
  return typeof url === "string" && url.includes("supabase.co/storage")
}

// Supabase URL → Vercel Blob 업로드
async function migrateUrl(url) {
  if (!isSupabaseUrl(url)) return url

  try {
    const res = await fetch(url)
    if (!res.ok) {
      console.warn(`  ⚠️  다운로드 실패 (${res.status}): ${url}`)
      return url
    }

    // URL에서 경로 추출 (storage/v1/object/public/public-images/XXX)
    const match = url.match(/public-images\/(.+)$/)
    const filename = match ? match[1] : `migrated/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`

    const buffer = await res.arrayBuffer()
    const contentType = res.headers.get("content-type") ?? "image/jpeg"

    const blob = await put(filename, buffer, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      token: BLOB_TOKEN,
      contentType,
    })

    console.log(`  ✅ ${filename}`)
    return blob.url
  } catch (err) {
    console.warn(`  ⚠️  오류: ${url}`, err.message)
    return url
  }
}

// HTML content 안의 img src 교체
async function migrateContent(html) {
  if (!html || !html.includes("supabase.co/storage")) return html
  const regex = /src="(https?:\/\/[^"]*supabase\.co\/storage[^"]*)"/g
  const urls = [...html.matchAll(regex)].map(m => m[1])
  let result = html
  for (const url of urls) {
    const newUrl = await migrateUrl(url)
    if (newUrl !== url) result = result.replaceAll(url, newUrl)
  }
  return result
}

// images[] 배열 마이그레이션
async function migrateImages(images) {
  if (!images?.length) return images
  const results = []
  for (const url of images) {
    results.push(await migrateUrl(url))
  }
  return results
}

let totalMigrated = 0
let totalSkipped = 0

// 테이블별 마이그레이션
async function migrateTable({ table, select, hasContent, updateFn }) {
  console.log(`\n📋 ${table} 마이그레이션 중...`)

  const { data, error } = await supabase.from(table).select(select)
  if (error) { console.error(`  ❌ 조회 실패:`, error.message); return }
  if (!data?.length) { console.log(`  - 데이터 없음`); return }

  console.log(`  총 ${data.length}건`)

  for (const row of data) {
    const hasSupabaseImages = row.images?.some(isSupabaseUrl)
    const hasSupabaseContent = hasContent && row.content && isSupabaseUrl(row.content)

    if (!hasSupabaseImages && !hasSupabaseContent) {
      totalSkipped++
      continue
    }

    const updates = {}
    if (hasSupabaseImages) updates.images = await migrateImages(row.images)
    if (hasSupabaseContent) updates.content = await migrateContent(row.content)

    const { error: updateError } = await updateFn(row.id, updates)
    if (updateError) {
      console.error(`  ❌ 업데이트 실패 (${row.id}):`, updateError.message)
    } else {
      totalMigrated++
    }
  }
}

async function main() {
  console.log("🚀 이미지 마이그레이션 시작\n")

  await migrateTable({
    table: "notices",
    select: "id, images, content",
    hasContent: true,
    updateFn: (id, updates) => supabase.from("notices").update(updates).eq("id", id),
  })

  await migrateTable({
    table: "daily_posts",
    select: "id, images, content",
    hasContent: true,
    updateFn: (id, updates) => supabase.from("daily_posts").update(updates).eq("id", id),
  })

  await migrateTable({
    table: "adoption_stories",
    select: "id, images, content",
    hasContent: true,
    updateFn: (id, updates) => supabase.from("adoption_stories").update(updates).eq("id", id),
  })

  await migrateTable({
    table: "dogs",
    select: "id, images",
    hasContent: false,
    updateFn: (id, updates) => supabase.from("dogs").update(updates).eq("id", id),
  })

  await migrateTable({
    table: "cats",
    select: "id, images",
    hasContent: false,
    updateFn: (id, updates) => supabase.from("cats").update(updates).eq("id", id),
  })

  console.log(`\n✅ 완료! 마이그레이션: ${totalMigrated}건 / 스킵: ${totalSkipped}건`)
}

main().catch(console.error)
