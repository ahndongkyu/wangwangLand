import { Fragment } from "react"

interface Props {
  text: string
  className?: string
}

const URL_REGEX = /https?:\/\/[^\s<>"']+/g

/**
 * 텍스트 내 URL을 자동으로 <a> 링크로 변환합니다.
 * whitespace-pre-wrap 스타일과 함께 사용하세요.
 */
export function LinkifiedText({ text, className }: Props) {
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  const regex = new RegExp(URL_REGEX.source, "g")

  while ((match = regex.exec(text)) !== null) {
    const url = match[0]
    const start = match.index

    // URL 앞의 일반 텍스트
    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start))
    }

    // URL → 링크
    parts.push(
      <a
        key={start}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all text-primary underline underline-offset-2 hover:opacity-80"
      >
        {url}
      </a>
    )

    lastIndex = start + url.length
  }

  // 남은 텍스트
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return (
    <p className={className}>
      {parts.map((part, i) => (
        <Fragment key={i}>{part}</Fragment>
      ))}
    </p>
  )
}
