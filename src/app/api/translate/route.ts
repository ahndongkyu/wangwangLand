import { createHash } from "node:crypto"
import { NextResponse } from "next/server"

import { isTranslationLocale, TRANSLATION_MONTHLY_LIMIT } from "@/features/translation/config"
import { createAdminClient } from "@/shared/lib/supabase/admin"

const MAX_TEXTS_PER_REQUEST = 40
const MAX_CHARACTERS_PER_REQUEST = 20_000

type TranslationRequest = {
  targetLocale?: string
  texts?: unknown
}

function hashText(text: string) {
  return createHash("sha256").update(text).digest("hex")
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin")
  const host = request.headers.get("host")
  if (origin && host && new URL(origin).host !== host) {
    return NextResponse.json({ error: "허용되지 않은 요청입니다." }, { status: 403 })
  }

  const body = await request.json().catch(() => null) as TranslationRequest | null
  if (!body || !isTranslationLocale(body.targetLocale ?? "") || !Array.isArray(body.texts)) {
    return NextResponse.json({ error: "번역 요청 형식이 올바르지 않습니다." }, { status: 400 })
  }

  const texts = [...new Set(body.texts)]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean)

  const characterCount = texts.reduce((total, text) => total + text.length, 0)
  if (
    texts.length === 0 ||
    texts.length > MAX_TEXTS_PER_REQUEST ||
    characterCount > MAX_CHARACTERS_PER_REQUEST
  ) {
    return NextResponse.json({ error: "한 번에 번역할 수 있는 분량을 초과했습니다." }, { status: 400 })
  }

  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "번역 기능 설정이 아직 완료되지 않았습니다." },
      { status: 503 }
    )
  }

  const admin = createAdminClient()
  const hashes = texts.map(hashText)
  const { data: cached, error: cacheError } = await admin
    .from("translation_cache")
    .select("source_hash, translated_text")
    .eq("target_locale", body.targetLocale)
    .in("source_hash", hashes)

  if (cacheError) {
    console.error("[translate/cache-read]", cacheError)
    return NextResponse.json({ error: "번역 정보를 불러오지 못했습니다." }, { status: 500 })
  }

  const result = new Map((cached ?? []).map((row) => [row.source_hash, row.translated_text]))
  const missing = texts.filter((text) => !result.has(hashText(text)))

  if (missing.length > 0) {
    const missingCharacters = missing.reduce((total, text) => total + text.length, 0)
    const { data: reserved, error: quotaError } = await admin.rpc(
      "reserve_translation_characters",
      { requested_count: missingCharacters }
    )

    if (quotaError) {
      console.error("[translate/quota]", quotaError)
      return NextResponse.json({ error: "번역 사용량을 확인하지 못했습니다." }, { status: 500 })
    }
    if (!reserved) {
      return NextResponse.json(
        { error: `이번 달 무료 번역 한도(${TRANSLATION_MONTHLY_LIMIT.toLocaleString()}자)에 도달했습니다.` },
        { status: 429 }
      )
    }

    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          q: missing,
          source: "ko",
          target: body.targetLocale === "zh" ? "zh-CN" : "en",
          format: "text",
        }),
      }
    )

    if (!response.ok) {
      console.error("[translate/google]", await response.text())
      return NextResponse.json({ error: "번역 서비스를 사용할 수 없습니다." }, { status: 502 })
    }

    const payload = await response.json() as {
      data?: { translations?: Array<{ translatedText?: string }> }
    }
    const translated = payload.data?.translations?.map((item) => item.translatedText ?? "") ?? []
    if (translated.length !== missing.length || translated.some((text) => !text)) {
      return NextResponse.json({ error: "번역 결과가 올바르지 않습니다." }, { status: 502 })
    }

    const rows = missing.map((sourceText, index) => ({
      source_hash: hashText(sourceText),
      source_locale: "ko",
      target_locale: body.targetLocale,
      source_text: sourceText,
      translated_text: translated[index],
      character_count: sourceText.length,
    }))
    const { error: saveError } = await admin
      .from("translation_cache")
      .upsert(rows, { onConflict: "source_hash,target_locale", ignoreDuplicates: true })

    if (saveError) console.error("[translate/cache-write]", saveError)
    rows.forEach((row) => result.set(row.source_hash, row.translated_text))
  }

  return NextResponse.json({
    translations: Object.fromEntries(texts.map((text) => [text, result.get(hashText(text)) ?? text])),
  })
}
