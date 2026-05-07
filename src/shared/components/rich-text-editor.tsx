"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useEditor, EditorContent, type Editor } from "@tiptap/react"
import { BubbleMenu } from "@tiptap/react/menus"
import StarterKit from "@tiptap/starter-kit"
import { ImageResize } from "tiptap-extension-resize-image"
import TiptapLink from "@tiptap/extension-link"
import Underline from "@tiptap/extension-underline"
import TextAlign from "@tiptap/extension-text-align"
import Color from "@tiptap/extension-color"
import { TextStyle } from "@tiptap/extension-text-style"
import Placeholder from "@tiptap/extension-placeholder"
import {
  Bold,
  Italic,
  UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link2,
  ImageIcon,
  Undo2,
  Redo2,
  Loader2,
  Camera,
  MoreHorizontal,
  ChevronUp,
  ChevronDown,
  Trash2,
} from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { compressImage } from "@/shared/lib/compress-image"
import { useDraftSave } from "@/shared/hooks/use-draft-save"

interface Props {
  name: string
  defaultValue?: string
  placeholder?: string
  folder?: string
  /** 본문 내 삽입 가능한 최대 이미지 수 (기본 10) */
  maxImages?: number
  /** 이미지 1장 최대 용량 MB (기본 10) */
  maxFileSizeMB?: number
  /** 콘텐츠가 변경될 때마다 호출되는 콜백 */
  onChange?: (html: string) => void
  /**
   * 임시저장 키. 지정하면 LocalStorage에 자동 저장 + 복원 배너를 표시.
   * 형식: "draft:notices:new" 처럼 충돌 없는 고유 키 권장.
   */
  draftKey?: string
}

export function RichTextEditor({
  name,
  defaultValue = "",
  placeholder = "내용을 입력하세요.",
  folder = "posts",
  maxImages = 10,
  maxFileSizeMB = 10,
  onChange,
  draftKey,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [imageCount, setImageCount] = useState(
    () => (defaultValue.match(/<img/g) ?? []).length
  )
  // form 제출 시 최신 HTML 을 전달하기 위한 ref
  const hiddenRef = useRef<HTMLInputElement>(null)
  // 툴바 active 상태를 re-render 시키기 위한 counter
  const [, forceUpdate] = useState(0)
  // 이미지 버튼 클릭 직전의 selection (mobile에서 file picker 거치며 selection 잃는 것 방지)
  const savedSelectionRef = useRef<{ from: number; to: number } | null>(null)
  // 에디터 현재 HTML (draft 저장용)
  const [editorHtml, setEditorHtml] = useState(defaultValue)
  const { hasDraft, savedAt, getDraftValue, clearDraft } = useDraftSave(
    draftKey ?? "",
    editorHtml,
    !!draftKey
  )
  const [draftDismissed, setDraftDismissed] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      ImageResize.configure({ inline: false }),
      TiptapLink.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      Placeholder.configure({ placeholder }),
    ],
    content: defaultValue,
    immediatelyRender: false,
    onUpdate({ editor }) {
      const html = editor.getHTML()
      if (hiddenRef.current) hiddenRef.current.value = html
      onChange?.(html)
      setImageCount((html.match(/<img/g) ?? []).length)
      setEditorHtml(html)
    },
    onSelectionUpdate({ editor }) {
      // 커서 이동 시 툴바 활성 상태 갱신 + selection 지속 저장 (mobile file picker 후 복원용)
      const { from, to } = editor.state.selection
      savedSelectionRef.current = { from, to }
      forceUpdate((n) => n + 1)
    },
    onTransaction() {
      forceUpdate((n) => n + 1)
    },
    editorProps: {
      attributes: {
        class: "min-h-[420px] px-4 py-3 focus:outline-none text-sm leading-relaxed",
      },
      // 클립보드에 이미지가 있으면 그것만 자동 업로드해서 본문 삽입
      handlePaste(_view, event) {
        const items = Array.from(event.clipboardData?.items ?? [])
        const imageItems = items.filter((it) => it.type.startsWith("image/"))
        if (imageItems.length === 0) return false
        event.preventDefault()
        void (async () => {
          for (const it of imageItems) {
            const file = it.getAsFile()
            if (file) await handleImageUploadRef.current(file)
          }
        })()
        return true
      },
      // 파일 드래그앤드롭으로 본문에 이미지 삽입
      handleDrop(_view, event, _slice, moved) {
        if (moved) return false
        const dt = (event as DragEvent).dataTransfer
        const files = Array.from(dt?.files ?? []).filter((f) => f.type.startsWith("image/"))
        if (files.length === 0) return false
        event.preventDefault()
        void (async () => {
          for (const f of files) {
            await handleImageUploadRef.current(f)
          }
        })()
        return true
      },
    },
  })

  // ── 이미지 업로드 ──────────────────────────────────────────────
  const handleImageUpload = useCallback(
    async (file: File) => {
      // 개수 제한
      if (imageCount >= maxImages) {
        alert(`이미지는 최대 ${maxImages}장까지 삽입할 수 있어요.`)
        return
      }
      if (!editor) return

      setUploading(true)
      try {
        // 업로드 전 자동 압축 (PNG / 큰 사진 → 1920px JPG 로 재인코딩)
        // 클립보드 PNG 가 무손실이라 쉽게 10MB 넘는 이슈 해결.
        let prepared: File
        try {
          prepared = await compressImage(file)
        } catch (e) {
          console.warn("[image] compress failed, using original:", e)
          prepared = file
        }

        // 압축 후에도 한도 초과면 거부
        if (prepared.size > maxFileSizeMB * 1024 * 1024) {
          alert(
            `이미지 용량이 ${maxFileSizeMB}MB 를 초과합니다 (압축 후 ${(prepared.size / 1024 / 1024).toFixed(1)}MB).`
          )
          return
        }

        const ext = prepared.name.split(".").pop() ?? "jpg"
        const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

        const res = await fetch(`/api/upload?filename=${encodeURIComponent(filename)}`, {
          method: "POST",
          body: prepared,
        })
        if (!res.ok) {
          const { error } = await res.json().catch(() => ({ error: "업로드 실패" }))
          alert(`이미지 업로드 실패: ${error}`)
          return
        }
        const data = await res.json()

        // 모바일에서 file picker 거치며 lost된 selection 복원.
        // savedSelectionRef 는 onSelectionUpdate 에서 항상 최신값 유지.
        // focus(pos) 로 iOS selection 리셋 문제를 우회해 정확한 위치에 삽입.
        // scrollIntoView: false 로 mobile 화면이 위로 점프하는 현상 방지.
        const saved = savedSelectionRef.current
        const insertPos = saved
          ? saved.from
          : Math.max(0, editor.state.doc.content.size - 1)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(editor.chain() as any)
          .focus(insertPos, { scrollIntoView: false })
          .setImage({ src: data.url })
          .createParagraphNear()
          .run()
      } finally {
        setUploading(false)
      }
    },
    [editor, folder, imageCount, maxImages, maxFileSizeMB]
  )

  // editorProps.handlePaste / handleDrop 이 stale closure 안 되게 ref 로 감싸기
  const handleImageUploadRef = useRef(handleImageUpload)
  useEffect(() => {
    handleImageUploadRef.current = handleImageUpload
  }, [handleImageUpload])

  const onFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? [])
      e.target.value = ""
      if (files.length === 0) return

      // 동기 업로드 중 setImageCount 가 비동기로 늦게 반영되어 stale closure 이슈 발생
      // → 미리 maxImages 초과분을 잘라낸다.
      const remaining = Math.max(0, maxImages - imageCount)
      if (remaining === 0) {
        alert(`이미지는 최대 ${maxImages}장까지 삽입할 수 있어요.`)
        return
      }
      const accepted = files.slice(0, remaining)
      if (files.length > remaining) {
        alert(`최대 ${maxImages}장 제한으로 ${remaining}장만 업로드합니다.`)
      }

      // 순차 업로드 (병렬 시 storage 경합 + 에디터 setImage 순서 꼬임 방지)
      for (const file of accepted) {
        await handleImageUpload(file)
      }
    },
    [handleImageUpload, imageCount, maxImages]
  )

  // ── 링크 삽입 ──────────────────────────────────────────────────
  const handleLink = useCallback(() => {
    const prev = editor?.getAttributes("link").href ?? ""
    const url = prompt("링크 URL을 입력하세요", prev)
    if (url === null) return
    if (url === "") { editor?.chain().focus().unsetLink().run(); return }
    editor?.chain().focus().setLink({ href: url }).run()
  }, [editor])

  // selection 저장 헬퍼
  const saveSelection = useCallback(() => {
    if (editor) {
      const { from, to } = editor.state.selection
      savedSelectionRef.current = { from, to }
    }
  }, [editor])

  // ── 이미지 이동 헬퍼 ──────────────────────────────────────────
  function moveImageUp() {
    if (!editor) return
    const { state } = editor
    const { selection } = state
    const pos = selection.$anchor.pos
    const $pos = state.doc.resolve(pos)
    const parent = $pos.parent
    const index = $pos.index()
    if (index === 0) return
    const prevNode = parent.child(index - 1)
    const curNode = parent.child(index)
    const curNodeStart = $pos.before()
    const prevNodeStart = curNodeStart - prevNode.nodeSize
    const tr = state.tr
    tr.delete(prevNodeStart, curNodeStart + curNode.nodeSize)
    tr.insert(prevNodeStart, [curNode, prevNode])
    editor.view.dispatch(tr)
  }

  function moveImageDown() {
    if (!editor) return
    const { state } = editor
    const { selection } = state
    const pos = selection.$anchor.pos
    const $pos = state.doc.resolve(pos)
    const parent = $pos.parent
    const index = $pos.index()
    if (index >= parent.childCount - 1) return
    const nextNode = parent.child(index + 1)
    const curNode = parent.child(index)
    const curNodeStart = $pos.before()
    const nextNodeEnd = curNodeStart + curNode.nodeSize + nextNode.nodeSize
    const tr = state.tr
    tr.delete(curNodeStart, nextNodeEnd)
    tr.insert(curNodeStart, [nextNode, curNode])
    editor.view.dispatch(tr)
  }

  function deleteImage() {
    if (!editor) return
    editor.chain().focus().deleteSelection().run()
  }

  if (!editor) return null

  // ── 툴바 버튼 스타일 ──────────────────────────────────────────
  const btn = (active: boolean) =>
    cn(
      "flex size-7 items-center justify-center rounded transition-colors",
      active
        ? "bg-primary text-primary-foreground"
        : "text-foreground/60 hover:bg-secondary hover:text-foreground"
    )

  const btnMobile = (active: boolean) =>
    cn(
      "flex size-10 items-center justify-center rounded-lg transition-colors",
      active
        ? "bg-primary text-primary-foreground"
        : "text-foreground/60 hover:bg-secondary hover:text-foreground"
    )

  return (
    <div className="overflow-hidden rounded-lg border border-input bg-background focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
      {/* form submit 시 에디터 HTML 전달 */}
      <input
        ref={hiddenRef}
        type="hidden"
        name={name}
        defaultValue={defaultValue}
      />

      {/* ── 임시저장 복원 배너 ──────────────────────────────────── */}
      {hasDraft && !draftDismissed && (
        <div className="flex items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs dark:border-amber-800/40 dark:bg-amber-900/20">
          <span className="text-amber-800 dark:text-amber-300">
            {savedAt
              ? `임시저장된 내용이 있어요 (${savedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })})`
              : "임시저장된 내용이 있어요"}
          </span>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => {
                const draft = getDraftValue()
                if (draft && editor) {
                  editor.commands.setContent(draft)
                  if (hiddenRef.current) hiddenRef.current.value = draft
                  setEditorHtml(draft)
                  onChange?.(draft)
                }
                clearDraft()
                setDraftDismissed(true)
              }}
              className="font-semibold text-amber-700 hover:underline dark:text-amber-400"
            >
              불러오기
            </button>
            <button
              type="button"
              onClick={() => { clearDraft(); setDraftDismissed(true) }}
              className="text-amber-600 hover:underline dark:text-amber-500"
            >
              무시
            </button>
          </div>
        </div>
      )}
      {draftKey && savedAt && !hasDraft && (
        <div className="flex items-center justify-between border-b border-border bg-secondary/20 px-3 py-1.5 text-[11px] text-muted-foreground">
          <span>자동 저장됨 ({savedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })})</span>
          <button type="button" onClick={clearDraft} className="hover:underline">초기화</button>
        </div>
      )}

      {/* ── 모바일 툴바 (sm 미만) ────────────────────────────────── */}
      <div className="sm:hidden border-b border-border bg-secondary/30">
        {/* Primary row */}
        <div className="flex items-center gap-0.5 px-2 py-1.5">
          {/* 굵게 */}
          <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btnMobile(editor.isActive("bold"))} title="굵게" aria-label="굵게">
            <Bold className="size-4" />
          </button>
          {/* 기울임 */}
          <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btnMobile(editor.isActive("italic"))} title="기울임" aria-label="기울임">
            <Italic className="size-4" />
          </button>
          {/* H1 */}
          <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={btnMobile(editor.isActive("heading", { level: 1 }))} title="제목 1" aria-label="제목 1">
            <Heading1 className="size-4" />
          </button>
          {/* 링크 */}
          <button type="button" onClick={handleLink} className={btnMobile(editor.isActive("link"))} title="링크 삽입" aria-label="링크 삽입">
            <Link2 className="size-4" />
          </button>
          {/* 갤러리 */}
          <button
            type="button"
            onPointerDown={saveSelection}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || imageCount >= maxImages}
            className={btnMobile(false)}
            title={imageCount >= maxImages ? `이미지 최대 ${maxImages}장` : "이미지 삽입"}
            aria-label="이미지 삽입"
          >
            {uploading
              ? <Loader2 className="size-4 animate-spin" />
              : <ImageIcon className="size-4" />
            }
          </button>
          {/* 카메라 (모바일 전용) */}
          <button
            type="button"
            onPointerDown={saveSelection}
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading || imageCount >= maxImages}
            className={btnMobile(false)}
            title="카메라로 촬영"
            aria-label="카메라로 촬영"
          >
            <Camera className="size-4" />
          </button>
          {/* 이미지 카운터 */}
          <span className={cn(
            "ml-auto mr-1 text-[10px] tabular-nums",
            imageCount >= maxImages ? "text-destructive font-semibold" : "text-muted-foreground"
          )}>
            {imageCount}/{maxImages}
          </span>
          {/* 더보기 */}
          <button type="button" onClick={() => setMoreOpen(v => !v)} className={btnMobile(moreOpen)} aria-label="더보기">
            <MoreHorizontal className="size-4" />
          </button>
        </div>
        {/* Secondary row */}
        {moreOpen && (
          <div className="flex flex-wrap gap-0.5 border-t border-border px-2 py-1.5 bg-secondary/20">
            <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btnMobile(editor.isActive("heading", { level: 2 }))} title="제목 2" aria-label="제목 2">
              <Heading2 className="size-4" />
            </button>
            <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btnMobile(editor.isActive("heading", { level: 3 }))} title="제목 3" aria-label="제목 3">
              <Heading3 className="size-4" />
            </button>
            <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={btnMobile(editor.isActive("underline"))} title="밑줄" aria-label="밑줄">
              <UnderlineIcon className="size-4" />
            </button>
            <button type="button" onClick={() => editor.chain().focus().setTextAlign("left").run()} className={btnMobile(editor.isActive({ textAlign: "left" }))} title="왼쪽 정렬" aria-label="왼쪽 정렬">
              <AlignLeft className="size-4" />
            </button>
            <button type="button" onClick={() => editor.chain().focus().setTextAlign("center").run()} className={btnMobile(editor.isActive({ textAlign: "center" }))} title="가운데 정렬" aria-label="가운데 정렬">
              <AlignCenter className="size-4" />
            </button>
            <button type="button" onClick={() => editor.chain().focus().setTextAlign("right").run()} className={btnMobile(editor.isActive({ textAlign: "right" }))} title="오른쪽 정렬" aria-label="오른쪽 정렬">
              <AlignRight className="size-4" />
            </button>
            <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btnMobile(editor.isActive("bulletList"))} title="글머리 목록" aria-label="글머리 목록">
              <List className="size-4" />
            </button>
            <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btnMobile(editor.isActive("orderedList"))} title="번호 목록" aria-label="번호 목록">
              <ListOrdered className="size-4" />
            </button>
            <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btnMobile(editor.isActive("blockquote"))} title="인용구" aria-label="인용구">
              <Quote className="size-4" />
            </button>
            <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} className={btnMobile(false)} title="구분선" aria-label="구분선">
              <Minus className="size-4" />
            </button>
            <button type="button" onClick={() => editor.chain().focus().undo().run()} className={btnMobile(false)} title="되돌리기" aria-label="되돌리기">
              <Undo2 className="size-4" />
            </button>
            <button type="button" onClick={() => editor.chain().focus().redo().run()} className={btnMobile(false)} title="다시 실행" aria-label="다시 실행">
              <Redo2 className="size-4" />
            </button>
          </div>
        )}
      </div>

      {/* ── 데스크탑 툴바 (sm 이상) ──────────────────────────────── */}
      <div className="hidden sm:flex flex-wrap items-center gap-0.5 border-b border-border bg-secondary/30 px-2 py-1.5">
        {/* 되돌리기 */}
        <button type="button" onClick={() => editor.chain().focus().undo().run()} className={btn(false)} title="되돌리기" aria-label="되돌리기">
          <Undo2 className="size-3.5" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().redo().run()} className={btn(false)} title="다시 실행" aria-label="다시 실행">
          <Redo2 className="size-3.5" />
        </button>

        <span className="mx-1 h-4 w-px bg-border" />

        {/* 제목 크기 */}
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={btn(editor.isActive("heading", { level: 1 }))} title="제목 1 (H1)" aria-label="제목 1 (H1)">
          <Heading1 className="size-3.5" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btn(editor.isActive("heading", { level: 2 }))} title="제목 2 (H2)" aria-label="제목 2 (H2)">
          <Heading2 className="size-3.5" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btn(editor.isActive("heading", { level: 3 }))} title="제목 3 (H3)" aria-label="제목 3 (H3)">
          <Heading3 className="size-3.5" />
        </button>

        <span className="mx-1 h-4 w-px bg-border" />

        {/* 텍스트 스타일 */}
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive("bold"))} title="굵게 (Ctrl+B)" aria-label="굵게 (Ctrl+B)">
          <Bold className="size-3.5" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive("italic"))} title="기울임 (Ctrl+I)" aria-label="기울임 (Ctrl+I)">
          <Italic className="size-3.5" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={btn(editor.isActive("underline"))} title="밑줄 (Ctrl+U)" aria-label="밑줄 (Ctrl+U)">
          <UnderlineIcon className="size-3.5" />
        </button>

        <span className="mx-1 h-4 w-px bg-border" />

        {/* 정렬 */}
        <button type="button" onClick={() => editor.chain().focus().setTextAlign("left").run()} className={btn(editor.isActive({ textAlign: "left" }))} title="왼쪽 정렬" aria-label="왼쪽 정렬">
          <AlignLeft className="size-3.5" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign("center").run()} className={btn(editor.isActive({ textAlign: "center" }))} title="가운데 정렬" aria-label="가운데 정렬">
          <AlignCenter className="size-3.5" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign("right").run()} className={btn(editor.isActive({ textAlign: "right" }))} title="오른쪽 정렬" aria-label="오른쪽 정렬">
          <AlignRight className="size-3.5" />
        </button>

        <span className="mx-1 h-4 w-px bg-border" />

        {/* 목록 */}
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive("bulletList"))} title="글머리 목록" aria-label="글머리 목록">
          <List className="size-3.5" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive("orderedList"))} title="번호 목록" aria-label="번호 목록">
          <ListOrdered className="size-3.5" />
        </button>

        <span className="mx-1 h-4 w-px bg-border" />

        {/* 인용 · 구분선 */}
        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btn(editor.isActive("blockquote"))} title="인용구" aria-label="인용구">
          <Quote className="size-3.5" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} className={btn(false)} title="구분선" aria-label="구분선">
          <Minus className="size-3.5" />
        </button>

        <span className="mx-1 h-4 w-px bg-border" />

        {/* 링크 */}
        <button type="button" onClick={handleLink} className={btn(editor.isActive("link"))} title="링크 삽입" aria-label="링크 삽입">
          <Link2 className="size-3.5" />
        </button>

        {/* 이미지 */}
        <button
          type="button"
          onPointerDown={() => {
            // file picker 열기 전에 현재 selection 저장 (mobile 에서 거치며 lost되는 것 방지)
            if (editor) {
              const { from, to } = editor.state.selection
              savedSelectionRef.current = { from, to }
            }
          }}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || imageCount >= maxImages}
          className={btn(false)}
          title={imageCount >= maxImages ? `이미지 최대 ${maxImages}장` : "이미지 삽입"}
        >
          {uploading
            ? <Loader2 className="size-3.5 animate-spin" />
            : <ImageIcon className="size-3.5" />
          }
        </button>

        {/* 이미지 카운터 */}
        <span className={cn(
          "ml-1 text-[10px] tabular-nums",
          imageCount >= maxImages ? "text-destructive font-semibold" : "text-muted-foreground"
        )}>
          {imageCount}/{maxImages}
        </span>
      </div>

      {/* 파일 인풋 (갤러리) */}
      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={onFileChange} />
      {/* 파일 인풋 (카메라, 모바일 전용) */}
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFileChange} />

      {/* ── 이미지 선택 시 플로팅 툴바 ──────────────────────── */}
      <BubbleMenu
        editor={editor}
        shouldShow={({ editor: ed }) => (ed as Editor | null)?.isActive("image") ?? false}
      >
        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-popover p-1 shadow-lg">
          <button
            type="button"
            onPointerDown={(e) => { e.preventDefault(); moveImageUp() }}
            className="flex size-8 items-center justify-center rounded text-foreground/70 transition-colors hover:bg-secondary hover:text-foreground"
            title="위로 이동"
            aria-label="이미지 위로 이동"
          >
            <ChevronUp className="size-4" />
          </button>
          <button
            type="button"
            onPointerDown={(e) => { e.preventDefault(); moveImageDown() }}
            className="flex size-8 items-center justify-center rounded text-foreground/70 transition-colors hover:bg-secondary hover:text-foreground"
            title="아래로 이동"
            aria-label="이미지 아래로 이동"
          >
            <ChevronDown className="size-4" />
          </button>
          <span className="mx-0.5 h-4 w-px bg-border" />
          <button
            type="button"
            onPointerDown={(e) => { e.preventDefault(); deleteImage() }}
            className="flex size-8 items-center justify-center rounded text-destructive/70 transition-colors hover:bg-destructive/10 hover:text-destructive"
            title="이미지 삭제"
            aria-label="이미지 삭제"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </BubbleMenu>

      {/* ── 에디터 본문 ──────────────────────────────────────── */}
      <EditorContent editor={editor} />
    </div>
  )
}
