/** Данные раздела «Материалы»: сканируем папку materials/ на этапе сборки.
 * Структура: materials/<Семестр>/<Дисциплина>/ — имена папок зеркалят content/,
 * чтобы материалы легко находились по нужной дисциплине. Файлы просто кладутся
 * в папку дисциплины и попадают на сайт автоматически. Опциональный index.json
 * рядом описывает набор: описание, внешние ссылки, уточнённые названия файлов. */

import { naturalCompare, parseName } from './content'

export interface MaterialFile {
  /** Имя файла на диске — для атрибута download */
  name: string
  /** Показываемое название: index.json → files → title, иначе имя файла */
  title: string
  /** Пояснение из index.json или null */
  description: string | null
  /** URL ассета Vite */
  url: string
}

export interface MaterialLink {
  title: string
  url: string
  description: string | null
}

export interface MaterialsDiscipline {
  /** Имя папки дисциплины (= часть URL) */
  slug: string
  title: string
  order: number
  /** Путь в URL: семестр/дисциплина */
  path: string
  semesterSlug: string
  semesterTitle: string
  /** Описание набора материалов из index.json */
  description: string | null
  files: MaterialFile[]
  links: MaterialLink[]
}

export interface MaterialsSemester {
  slug: string
  title: string
  order: number
  disciplines: MaterialsDiscipline[]
}

interface Manifest {
  description?: unknown
  links?: unknown
  files?: unknown
}

interface FileOverride {
  title?: unknown
  description?: unknown
}

const MANIFEST_NAME = 'index.json'

const manifests = import.meta.glob('/materials/**/index.json', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const assets = import.meta.glob('/materials/**/*', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>

function cleanText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function parseLinks(value: unknown): MaterialLink[] {
  if (!Array.isArray(value)) return []
  const links: MaterialLink[] = []
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue
    const record = entry as Record<string, unknown>
    const url = cleanText(record.url)
    if (!url) continue
    links.push({
      title: cleanText(record.title) ?? url,
      url,
      description: cleanText(record.description),
    })
  }
  return links
}

function fileOverrides(value: unknown): Record<string, FileOverride> {
  if (!value || typeof value !== 'object') return {}
  const result: Record<string, FileOverride> = {}
  for (const [name, entry] of Object.entries(value)) {
    if (entry && typeof entry === 'object') result[name] = entry as FileOverride
  }
  return result
}

function buildTree(): MaterialsSemester[] {
  const semesters = new Map<string, MaterialsSemester>()
  const disciplines = new Map<string, MaterialsDiscipline>()

  /** Дисциплина по пути materials/<семестр>/<дисциплина>/<файл>; вложенность глубже — игнорируем */
  function disciplineFor(path: string): MaterialsDiscipline | null {
    const parts = path.slice('/materials/'.length).split('/')
    if (parts.length !== 3) return null
    const [semName, discName] = parts
    const key = `${semName}/${discName}`
    let discipline = disciplines.get(key)
    if (!discipline) {
      const semParsed = parseName(semName)
      let semester = semesters.get(semName)
      if (!semester) {
        semester = { slug: semName, title: semParsed.title, order: semParsed.order, disciplines: [] }
        semesters.set(semName, semester)
      }
      const discParsed = parseName(discName)
      discipline = {
        slug: discName,
        title: discParsed.title,
        order: discParsed.order,
        path: key,
        semesterSlug: semName,
        semesterTitle: semester.title,
        description: null,
        files: [],
        links: [],
      }
      disciplines.set(key, discipline)
      semester.disciplines.push(discipline)
    }
    return discipline
  }

  // Файлы: всё, что лежит в materials/**, кроме манифестов index.json
  for (const [file, url] of Object.entries(assets)) {
    const name = file.split('/').pop() ?? ''
    if (!name || name === MANIFEST_NAME) continue
    const discipline = disciplineFor(file)
    if (!discipline) continue
    discipline.files.push({ name, title: name, description: null, url })
  }

  // Манифесты: описание, внешние ссылки, уточнения к файлам
  for (const [file, raw] of Object.entries(manifests)) {
    const discipline = disciplineFor(file)
    if (!discipline) continue
    let manifest: Manifest = {}
    try {
      const parsed: unknown = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') manifest = parsed as Manifest
    } catch {
      // битый index.json — остаются значения по умолчанию
    }
    discipline.description = cleanText(manifest.description)
    discipline.links = parseLinks(manifest.links)
    const overrides = fileOverrides(manifest.files)
    for (const entry of discipline.files) {
      const override = overrides[entry.name]
      if (!override) continue
      const title = cleanText(override.title)
      if (title) entry.title = title
      entry.description = cleanText(override.description)
    }
  }

  const sorted = [...semesters.values()].sort(
    (a, b) => a.order - b.order || naturalCompare(a.title, b.title),
  )
  for (const semester of sorted) {
    semester.disciplines.sort((a, b) => a.order - b.order || naturalCompare(a.title, b.title))
    for (const discipline of semester.disciplines) {
      discipline.files.sort((a, b) => naturalCompare(a.title, b.title))
    }
  }
  return sorted
}

export const materialSemesters: MaterialsSemester[] = buildTree()

export const materialDisciplines: MaterialsDiscipline[] = materialSemesters.flatMap(
  (s) => s.disciplines,
)

export function findMaterials(
  semester: string | undefined,
  discipline: string | undefined,
): MaterialsDiscipline | undefined {
  if (!semester || !discipline) return undefined
  return materialDisciplines.find((d) => d.path === `${semester}/${discipline}`)
}
