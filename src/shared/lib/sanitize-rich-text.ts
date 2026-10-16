import sanitizeHtml from "sanitize-html"

/** 저장된 구형 글에도 적용한다. 에디터의 서식은 허용하되 실행 가능한 HTML은 제거한다. */
export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "s", "strike", "span", "div", "h1", "h2", "h3", "h4", "blockquote", "ul", "ol", "li", "hr", "pre", "code", "a", "img"],
    allowedAttributes: {
      "*": ["style"],
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height"],
      ol: ["start"],
    },
    allowedSchemes: ["https", "http", "mailto", "tel"],
    allowedSchemesByTag: { img: ["https", "http"] },
    allowProtocolRelative: false,
    allowedStyles: {
      "*": {
        "text-align": [/^(left|right|center|justify)$/],
        color: [/^#[\da-f]{3,8}$/i, /^rgba?\([\d\s.,%]+\)$/i],
        "font-size": [/^(?:[1-9]\d?|100)(?:px|pt|%)$/, /^(?:[0-3](?:\.\d+)?)(?:em|rem)$/],
        width: [/^\d{1,4}(?:px|%)$/],
        height: [/^\d{1,4}px$/, /^auto$/],
        "max-width": [/^100%$/],
      },
    },
    transformTags: {
      a: (_tag, attribs) => ({ tagName: "a", attribs: { ...attribs, rel: "noopener noreferrer", ...(attribs.target === "_blank" ? { target: "_blank" } : { target: "_self" }) } }),
    },
  })
}
