import { cn } from "@/shared/lib/utils"
import { sanitizeRichText } from "@/shared/lib/sanitize-rich-text"

interface Props {
  html: string
  className?: string
}

/**
 * Tiptap 에디터로 작성된 HTML 콘텐츠를 렌더링.
 * 회원·운영진 콘텐츠 모두 허용된 서식만 렌더링한다.
 *
 * 하위 호환: `<` 로 시작하지 않는 plain text 는 whitespace-pre-wrap 으로 표시.
 */
export function RichTextContent({ html, className }: Props) {
  const isHtml = html.trimStart().startsWith("<")

  if (!isHtml) {
    return (
      <div className={cn("whitespace-pre-wrap text-base leading-relaxed text-foreground/90", className)}>
        {html}
      </div>
    )
  }

  return (
    <div
      className={cn("rich-content", className)}
      dangerouslySetInnerHTML={{ __html: sanitizeRichText(html) }}
    />
  )
}
