/** Leitor de CSV (RFC 4180): aspas, vírgula ou ponto e vírgula, quebras de linha dentro de aspas. */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, '')
  const firstLine = text.split(/\r?\n/, 1)[0] ?? ''
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ','
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === delimiter) {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += c
  }
  if (field || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((cell) => cell.trim()))
}

/** Converte para objetos usando a primeira linha como cabeçalho (sem acento, minúsculo). */
export function csvToObjects(input: string): Record<string, string>[] {
  const [header, ...rows] = parseCsv(input)
  if (!header) return []
  const keys = header.map((h) =>
    h
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .trim()
      .toLowerCase(),
  )
  return rows.map((cells) => Object.fromEntries(keys.map((k, i) => [k, (cells[i] ?? '').trim()])))
}
