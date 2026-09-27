/** Conversões usadas nas aulas: texto simples → blocos, e link de vídeo → player. */

export type LessonBlock =
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; items: string[] }

/** "## Título" vira título; linhas com "• ", "- " ou "* " viram lista; o resto, parágrafos. */
export function parseLessonContent(content: string): LessonBlock[] {
  const blocks: LessonBlock[] = []
  let paragraph: string[] = []
  let list: string[] = []
  const flush = () => {
    if (paragraph.length) blocks.push({ kind: 'paragraph', text: paragraph.join(' ') })
    if (list.length) blocks.push({ kind: 'list', items: list })
    paragraph = []
    list = []
  }
  for (const rawLine of content.replace(/\r\n?/g, '\n').split('\n')) {
    const line = rawLine.trim()
    if (!line) {
      flush()
      continue
    }
    const heading = line.match(/^#{1,3}\s+(.+)$/)
    const item = line.match(/^(?:[•*-]|\d+[.)])\s+(.+)$/)
    if (heading) {
      flush()
      blocks.push({ kind: 'heading', text: heading[1] })
    } else if (item) {
      if (paragraph.length) {
        blocks.push({ kind: 'paragraph', text: paragraph.join(' ') })
        paragraph = []
      }
      list.push(item[1])
    } else {
      if (list.length) {
        blocks.push({ kind: 'list', items: list })
        list = []
      }
      paragraph.push(line)
    }
  }
  flush()
  return blocks
}

export type VideoEmbed = { kind: 'iframe'; src: string } | { kind: 'file'; src: string }

/** YouTube, Vimeo, Panda Video e arquivos .mp4/.webm. Outros links: sem player (mostra o link). */
export function toVideoEmbed(value: string | null | undefined): VideoEmbed | null {
  if (!value) return null
  let url: URL
  try {
    url = new URL(value.trim())
  } catch {
    return null
  }
  if (url.protocol !== 'https:') return null
  const host = url.hostname.replace(/^www\.|^m\./, '')

  if (host === 'youtu.be') {
    const id = url.pathname.slice(1).split('/')[0]
    return youtube(id)
  }
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname === '/watch') return youtube(url.searchParams.get('v'))
    const m = url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{6,})/)
    if (m) return youtube(m[1])
    return null
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const m = url.pathname.match(/(?:\/video)?\/(\d+)(?:\/([\da-f]+))?/)
    if (!m) return null
    const hash = m[2] ?? url.searchParams.get('h')
    return { kind: 'iframe', src: `https://player.vimeo.com/video/${m[1]}${hash ? `?h=${hash}` : ''}` }
  }
  if (host.endsWith('.pandavideo.com.br') || host.endsWith('.tv.pandavideo.com.br')) {
    return { kind: 'iframe', src: url.toString() }
  }
  if (/\.(mp4|webm)$/i.test(url.pathname)) return { kind: 'file', src: url.toString() }
  return null
}

function youtube(id: string | null | undefined): VideoEmbed | null {
  if (!id || !/^[\w-]{6,}$/.test(id)) return null
  return { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${id}?rel=0` }
}
