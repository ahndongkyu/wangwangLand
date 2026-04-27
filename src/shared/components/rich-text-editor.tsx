"use client"

import { useCallback, useRef, useState } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
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
} from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { createClient } from "@/shared/lib/supabase/client"

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
}

export function RichTextEditor({
  name,
  defaultValue = "",
  placeholder = "내용을 입력하세요.",
  folder = "posts",
  maxImages = 10,
  maxFileSizeMB = 10,
  onChange,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [imageCount, setImageCount] = useState(
    () => (defaultValue.match(/<img/g) ?? []).length
  )
  // form 제출 시 최신 HTML 을 전달하기 위한 ref
  const hiddenRef = useRef<HTMLInputElement>(null)
  // 툴바 active 상태를 re-render 시키기 위한 counter
  const [, forceUpdate] = useState(0)

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
    },
    onSelectionUpdate() {
      // 커서 이동 시 툴바 활성 상태 갱신
      forceUpdate((n) => n + 1)
    },
    onTransaction() {
      forceUpdate((n) => n + 1)
    },
    editorProps: {
      attributes: {
        class: "min-h-[420px] px-4 py-3 focus:outline-none text-sm leading-relaxed",
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
      // 용량 제한
      if (file.size > maxFileSizeMB * 1024 * 1024) {
        alert(`이미지 용량은 ${maxFileSizeMB}MB 이하만 가능해요.`)
        return
      }

      setUploading(true)
      try {
        const supabase = createClient()
        const ext = file.name.split(".").pop() ?? "jpg"
        const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

        const { error } = await supabase.storage
          .from("public-images")
          .upload(path, file, { cacheControl: "3600", upsert: false })

        if (error) { alert(`이미지 업로드 실패: ${error.message}`); return }

        const { data } = supabase.storage.from("public-images").getPublicUrl(path)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(editor?.chain().focus() as any).setImage({ src: data.publicUrl }).run()
      } finally {
        setUploading(false)
      }
    },
    [editor, folder, imageCount, maxImages, maxFileSizeMB]
  )

  const onFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      e.target.value = ""
      await handleImageUpload(file)
    },
    [handleImageUpload]
  )

  // ── 링크 삽입 ──────────────────────────────────────────────────
  const handleLink = useCallback(() => {
    const prev = editor?.getAttributes("link").href ?? ""
    const url = prompt("링크 URL을 입력하세요", prev)
    if (url === null) return
    if (url === "") { editor?.chain().focus().unsetLink().run(); return }
    editor?.chain().focus().setLink({ href: url }).run()
  }, [editor])

  if (!editor) return null

  // ── 툴바 버튼 스타일 ──────────────────────────────────────────
  const btn = (active: boolean) =>
    cn(
      "flex size-7 items-center justify-center rounded transition-colors",
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

      {/* ── 툴바 ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-secondary/30 px-2 py-1.5">
        {/* 되돌리기 */}
        <button type="button" onClick={() => editor.chain().focus().undo().run()} className={btn(false)} title="되돌리기">
          <Undo2 className="size-3.5" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().redo().run()} className={btn(false)} title="다시 실행">
          <Redo2 className="size-3.5" />
        </button>

        <span className="mx-1 h-4 w-px bg-border" />

        {/* 제목 크기 */}
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={btn(editor.isActive("heading", { level: 1 }))} title="제목 1 (H1)">
          <Heading1 className="size-3.5" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btn(editor.isActive("heading", { level: 2 }))} title="제목 2 (H2)">
          <Heading2 className="size-3.5" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btn(editor.isActive("heading", { level: 3 }))} title="제목 3 (H3)">
          <Heading3 className="size-3.5" />
        </button>

        <span className="mx-1 h-4 w-px bg-border" />

        {/* 텍스트 스타일 */}
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive("bold"))} title="굵게 (Ctrl+B)">
          <Bold className="size-3.5" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive("italic"))} title="기울임 (Ctrl+I)">
          <Italic className="size-3.5" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={btn(editor.isActive("underline"))} title="밑줄 (Ctrl+U)">
          <UnderlineIcon className="size-3.5" />
        </button>

        <span className="mx-1 h-4 w-px bg-border" />

        {/* 정렬 */}
        <button type="button" onClick={() => editor.chain().focus().setTextAlign("left").run()} className={btn(editor.isActive({ textAlign: "left" }))} title="왼쪽 정렬">
          <AlignLeft className="size-3.5" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign("center").run()} className={btn(editor.isActive({ textAlign: "center" }))} title="가운데 정렬">
          <AlignCenter className="size-3.5" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign("right").run()} className={btn(editor.isActive({ textAlign: "right" }))} title="오른쪽 정렬">
          <AlignRight className="size-3.5" />
        </button>

        <span className="mx-1 h-4 w-px bg-border" />

        {/* 목록 */}
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive("bulletList"))} title="글머리 목록">
          <List className="size-3.5" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive("orderedList"))} title="번호 목록">
          <ListOrdered className="size-3.5" />
        </button>

        <span className="mx-1 h-4 w-px bg-border" />

        {/* 인용 · 구분선 */}
        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btn(editor.isActive("blockquote"))} title="인용구">
          <Quote className="size-3.5" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} className={btn(false)} title="구분선">
          <Minus className="size-3.5" />
        </button>

        <span className="mx-1 h-4 w-px bg-border" />

        {/* 링크 */}
        <button type="button" onClick={handleLink} className={btn(editor.isActive("link"))} title="링크 삽입">
          <Link2 className="size-3.5" />
        </button>

        {/* 이미지 */}
        <button
          type="button"
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
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />

        {/* 이미지 카운터 */}
        <span className={cn(
          "ml-1 text-[10px] tabular-nums",
          imageCount >= maxImages ? "text-destructive font-semibold" : "text-muted-foreground"
        )}>
          {imageCount}/{maxImages}
        </span>
      </div>

      {/* ── 에디터 본문 ──────────────────────────────────────── */}
      <EditorContent editor={editor} />
    </div>
  )
}
