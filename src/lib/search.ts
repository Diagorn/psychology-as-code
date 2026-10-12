import Fuse from 'fuse.js'
import { lectures, type Lecture } from './content'

export type Range = [number, number]

export interface SearchDoc {
  lecture: Lecture
  title: string
  where: string
  text: string
}

export interface SearchHit {
  doc: SearchDoc
  titleRanges: Range[]
  snippet: string
  snippetRanges: Range[]
}

const docs: SearchDoc[] = lectures.map((l) => ({
  lecture: l,
  title: l.title,
  where: `${l.semesterTitle} · ${l.disciplineTitle}`,
  text: l.plain,
}))

const fuse = new Fuse(docs, {
  keys: [
    { name: 'title', weight: 3 },
    { name: 'text', weight: 1 },
  ],
  includeMatches: true,
  ignoreLocation: true,
  minMatchCharLength: 2,
  threshold: 0.32,
})

interface FuseMatch {
  key?: string
  value?: string
  indices?: ReadonlyArray<string | readonly number[]>
}

function parseIndices(match: FuseMatch): Range[] {
  if (!match.indices) return []
  return match.indices.map((r) =>
    typeof r === 'string' ? (r.split(':').map(Number) as Range) : [Number(r[0]), Number(r[1])],
  )
}

function mergeRanges(ranges: Range[]): Range[] {
  if (!ranges.length) return []
  const sorted = [...ranges].sort((a, b) => a[0] - b[0])
  const merged: Range[] = [[...sorted[0]!]]
  for (const r of sorted.slice(1)) {
    const last = merged[merged.length - 1]!
    if (r[0] <= last[1] + 1) last[1] = Math.max(last[1], r[1])
    else merged.push([...r])
  }
  return merged
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.lastIndexOf(' ', max)
  return text.slice(0, cut > 40 ? cut : max) + ' …'
}

function buildSnippet(text: string, ranges: Range[]): { snippet: string; ranges: Range[] } {
  if (!text) return { snippet: '', ranges: [] }
  if (!ranges.length) return { snippet: truncate(text, 130), ranges: [] }

  const first = ranges[0]!
  const center = (first[0] + first[1]) / 2
  let from = Math.max(0, Math.floor(center - 60))
  let to = Math.min(text.length, Math.ceil(center + 100))

  const sp1 = text.lastIndexOf(' ', from)
  if (sp1 > 0) from = sp1 + 1
  const sp2 = text.indexOf(' ', to)
  if (sp2 > 0) to = sp2

  const prefix = from > 0 ? '… ' : ''
  const shifted = ranges
    .filter((r) => r[1] >= from && r[0] < to)
    .map((r) => [r[0] - from + prefix.length, Math.min(r[1], to - 1) - from + prefix.length] as Range)

  const suffix = to < text.length ? ' …' : ''
  return { snippet: prefix + text.slice(from, to) + suffix, ranges: mergeRanges(shifted) }
}

export function searchNotes(query: string, limit = 8): SearchHit[] {
  const q = query.trim()
  if (q.length < 2) return []
  return fuse.search(q, { limit }).map((res) => {
    const matches = (res.matches ?? []) as unknown as FuseMatch[]
    const titleRanges = mergeRanges(
      matches.filter((m) => m.key === 'title').flatMap((m) => parseIndices(m)),
    )
    const textMatch = matches.find((m) => m.key === 'text' && m.value)
    const { snippet, ranges } = buildSnippet(textMatch?.value ?? '', parseIndices(textMatch ?? {}))
    return { doc: res.item, titleRanges, snippet, snippetRanges: ranges }
  })
}
