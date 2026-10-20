/** Оглавление книги: строится из md-конспекта по заголовкам h2 (части) и h3 (главы).
 * Идентификаторы совпадают с id, которые BookArticle проставляет заголовкам при рендере. */

export interface BookTocEntry {
  /** id якоря заголовка */
  id: string
  title: string
  level: 2 | 3
}

export interface BookTocItem extends BookTocEntry {
  /** Главы внутри части */
  children: BookTocItem[]
}

const FRONT_MATTER_RE = /^---\r?\n[\s\S]*?\r?\n---\s*(?:\r?\n|$)/

/** Снимаем встроенную разметку (**жирный**, `код`), оставляя чистый текст */
function stripInline(text: string): string {
  return text
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*?([^*]*?)\*\*?/g, '$1')
    .trim()
}

/** Детерминированный id заголовка по его тексту; кириллицу сохраняем */
export function headingId(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'razdel'
}

/** md-конспект → дерево «части → главы».
 * flat — у книги нет деления на части: главы (h2) идут плоским списком без папок,
 * подразделы (h3) в меню не показываются. */
export function parseBookToc(raw: string, flat = false): BookTocItem[] {
  const body = raw.replace(FRONT_MATTER_RE, '')
  const entries: BookTocEntry[] = []
  let inFence = false

  for (const line of body.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.startsWith('```')) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    const match = /^(##|###)\s+(.+)$/.exec(trimmed)
    if (!match) continue
    const level = match[1]!.length as 2 | 3
    const title = stripInline(match[2]!)
    entries.push({ id: headingId(title), title, level })
  }

  if (flat) {
    return entries
      .filter((e) => e.level === 2)
      .map((e) => ({ ...e, children: [] }))
  }

  // Группируем главы (h3) под частями (h2)
  const tree: BookTocItem[] = []
  let part: BookTocItem | null = null
  for (const entry of entries) {
    if (entry.level === 2) {
      part = { ...entry, children: [] }
      tree.push(part)
    } else if (part) {
      part.children.push({ ...entry, children: [] })
    } else {
      tree.push({ ...entry, children: [] }) // глава до первой части — показываем верхним уровнем
    }
  }
  return tree
}
