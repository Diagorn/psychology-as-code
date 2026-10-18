/** Данные раздела «Книги»: сканируем папку books/ на этапе сборки.
 * Каждая книга — папка books/<slug>/ с settings.json (карточка), md-конспектом
 * и pdf-оригиналом (подключается как ассет Vite). */

export interface Book {
  /** Имя папки книги (= slug в URL) */
  slug: string
  /** Название — settings.json → имя папки */
  title: string
  author: string
  /** Предмет/дисциплина для фильтра */
  subject: string
  /** Тип книги для фильтра или null, если в settings.json не указан/неизвестен */
  type: BookType | null
  /** Markdown конспекта или null, если файла ещё нет */
  raw: string | null
  /** URL pdf-файла (ассет Vite) или null */
  pdfUrl: string | null
  /** Исходное имя pdf-файла — для имени при скачивании */
  pdfName: string | null
}

interface BookSettings {
  title?: unknown
  author?: unknown
  subject?: unknown
  type?: unknown
}

/** Тип книги — settings.json → settings.type */
export type BookType = 'LEARNING_BOOK' | 'MONOGRAPHY' | 'GESTALT' | 'OTHER'

const BOOK_TYPES: readonly BookType[] = ['LEARNING_BOOK', 'MONOGRAPHY', 'GESTALT', 'OTHER']

function bookTypeOf(value: unknown): BookType | null {
  return typeof value === 'string' && (BOOK_TYPES as readonly string[]).includes(value)
    ? (value as BookType)
    : null
}

function folderOf(path: string): string {
  const rest = path.replace(/^\/books\//, '')
  return rest.slice(0, rest.indexOf('/'))
}

const settingsFiles = import.meta.glob('/books/*/settings.json', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const mdFiles = import.meta.glob('/books/*/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const pdfFiles = import.meta.glob('/books/*/*.pdf', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>

function buildBooks(): Book[] {
  const map = new Map<string, Book>()

  for (const file of [...Object.keys(settingsFiles), ...Object.keys(mdFiles), ...Object.keys(pdfFiles)]) {
    const slug = folderOf(file)
    if (!slug || map.has(slug)) continue
    map.set(slug, {
      slug,
      title: slug,
      author: '',
      subject: 'Не указан',
      type: null,
      raw: null,
      pdfUrl: null,
      pdfName: null,
    })
  }

  for (const [file, raw] of Object.entries(settingsFiles)) {
    const book = map.get(folderOf(file))
    if (!book) continue
    try {
      const meta = JSON.parse(raw) as BookSettings
      if (typeof meta.title === 'string' && meta.title.trim()) book.title = meta.title.trim()
      if (typeof meta.author === 'string' && meta.author.trim()) book.author = meta.author.trim()
      if (typeof meta.subject === 'string' && meta.subject.trim()) book.subject = meta.subject.trim()
      book.type = bookTypeOf(meta.type)
    } catch {
      // битый settings.json — оставляем значения по умолчанию
    }
  }

  for (const [file, raw] of Object.entries(mdFiles)) {
    const book = map.get(folderOf(file))
    if (book && book.raw === null) book.raw = raw
  }

  for (const [file, url] of Object.entries(pdfFiles)) {
    const book = map.get(folderOf(file))
    if (book && book.pdfUrl === null) {
      book.pdfUrl = url
      book.pdfName = file.split('/').pop() ?? null
    }
  }

  return [...map.values()].sort((a, b) => a.title.localeCompare(b.title, 'ru'))
}

export const books: Book[] = buildBooks()

export function findBook(slug: string | undefined): Book | undefined {
  if (!slug) return undefined
  return books.find((b) => b.slug === slug)
}
