import { load as yamlLoad } from 'js-yaml'

export interface Lecture {
  /** Имя файла без расширения */
  slug: string
  /** Название лекции (frontmatter → имя файла) */
  title: string
  /** Путь в URL: семестр/дисциплина/лекция */
  path: string
  /** Исходный markdown без frontmatter */
  raw: string
  /** Текст без разметки — для поиска */
  plain: string
  order: number
  semesterTitle: string
  disciplineTitle: string
}

export interface Discipline {
  slug: string
  title: string
  order: number
  lectures: Lecture[]
}

export interface Semester {
  slug: string
  title: string
  order: number
  disciplines: Discipline[]
}

interface Meta {
  title?: string
  order?: number
}

/** "01 Введение" / "02-История" → порядок + человекочитаемое название */
const PREFIX_RE = /^(\d+)[.\s_-]+(.+)$/

function parseName(name: string): { order: number; title: string } {
  const match = PREFIX_RE.exec(name)
  if (match) {
    return { order: parseInt(match[1]!, 10), title: match[2]!.replace(/_+/g, ' ').trim() }
  }
  return { order: Number.MAX_SAFE_INTEGER, title: name.replace(/_+/g, ' ').trim() }
}

const FRONT_MATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/

function extractFrontMatter(raw: string): { meta: Meta; body: string } {
  const match = FRONT_MATTER_RE.exec(raw)
  if (!match) return { meta: {}, body: raw }
  let meta: Meta = {}
  try {
    const parsed = yamlLoad(match[1]!)
    if (parsed && typeof parsed === 'object') meta = parsed as Meta
  } catch {
    // некорректный frontmatter игнорируем
  }
  return { meta, body: raw.slice(match[0].length) }
}

/** Markdown → обычный текст для поискового индекса */
function toPlainText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`\n]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/[*_~]+/g, '')
    .replace(/^\s{0,3}([-*_]\s*){3,}\s*$/gm, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, 'ru', { numeric: true, sensitivity: 'base' })
}

const files = import.meta.glob('/content/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

function buildTree(): Semester[] {
  const semesters = new Map<string, Semester>()
  const disciplines = new Map<string, Discipline>()

  for (const [file, raw] of Object.entries(files)) {
    const parts = file.slice('/content/'.length).replace(/\.md$/, '').split('/')
    if (parts.length !== 3) continue
    const [semName, discName, lectureName] = parts
    const { meta, body } = extractFrontMatter(raw)
    const fileName = parseName(lectureName!)
    const title = meta.title ?? fileName.title

    let semester = semesters.get(semName!)
    if (!semester) {
      const parsed = parseName(semName!)
      semester = { slug: semName!, title: parsed.title, order: parsed.order, disciplines: [] }
      semesters.set(semName!, semester)
    }

    const discKey = `${semName}/${discName}`
    let discipline = disciplines.get(discKey)
    if (!discipline) {
      const parsed = parseName(discName!)
      discipline = { slug: discName!, title: parsed.title, order: parsed.order, lectures: [] }
      disciplines.set(discKey, discipline)
      semester.disciplines.push(discipline)
    }

    discipline.lectures.push({
      slug: lectureName!,
      title,
      path: `${semName}/${discName}/${lectureName}`,
      raw: body,
      plain: toPlainText(body),
      order: meta.order ?? fileName.order,
      semesterTitle: semester.title,
      disciplineTitle: discipline.title,
    })
  }

  const sorted = [...semesters.values()].sort(
    (a, b) => a.order - b.order || naturalCompare(a.title, b.title),
  )
  for (const semester of sorted) {
    semester.disciplines.sort((a, b) => a.order - b.order || naturalCompare(a.title, b.title))
    for (const discipline of semester.disciplines) {
      discipline.lectures.sort((a, b) => a.order - b.order || naturalCompare(a.title, b.title))
    }
  }
  return sorted
}

export const semesters: Semester[] = buildTree()

export const lectures: Lecture[] = semesters.flatMap((s) =>
  s.disciplines.flatMap((d) => d.lectures),
)

export function findLecture(
  semester: string | undefined,
  discipline: string | undefined,
  lecture: string | undefined,
): Lecture | undefined {
  if (!semester || !discipline || !lecture) return undefined
  return lectures.find((l) => l.path === `${semester}/${discipline}/${lecture}`)
}
