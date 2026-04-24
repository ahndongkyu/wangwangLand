import { cn } from "@/shared/lib/utils"

interface Props {
  html: string
  className?: string
}

/**
 * Tiptap 에디터로 작성된 HTML 콘텐츠를 렌더링.
 * 어드민이 직접 작성한 콘텐츠만 들어오므로 dangerouslySetInnerHTML 사용.
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
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
