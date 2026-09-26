import { splitHighlight } from '@/lib/search-query'

export function Highlight({ text }: { text: string }) {
  return (
    <>
      {splitHighlight(text).map((part, i) =>
        part.match ? (
          <mark key={i} className="rounded bg-gold-300/15 px-0.5 text-gold-100">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  )
}
