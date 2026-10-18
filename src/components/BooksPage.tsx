import { BookOpen, ChevronDown, Download, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { books, type Book, type BookType } from '../lib/books'

const TYPE_LABELS: Record<BookType, string> = {
  LEARNING_BOOK: 'Учебник',
  MONOGRAPHY: 'Монография',
  GESTALT: 'Гештальт',
  OTHER: 'Другое',
}

const ALL_TYPES = Object.keys(TYPE_LABELS) as BookType[]

function TypeFilter({
  selected,
  onChange,
}: {
  selected: BookType[]
  onChange: (next: BookType[]) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // Закрываем дропдаун по клику мимо и по Escape
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const toggle = (t: BookType) => {
    onChange(selected.includes(t) ? selected.filter((x) => x !== t) : [...selected, t])
  }

  const label =
    selected.length === 0 || selected.length === ALL_TYPES.length
      ? 'Все типы'
      : selected.map((t) => TYPE_LABELS[t]).join(', ')

  return (
    <div className="type-filter" ref={rootRef}>
      <button
        type="button"
        className={`books-filter type-filter-btn${open ? ' open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Фильтр по типу книги"
      >
        <span className="type-filter-label">{label}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="type-menu" role="listbox" aria-multiselectable="true" aria-label="Тип книги">
          {ALL_TYPES.map((t) => (
            <label key={t} className="type-option">
              <input
                type="checkbox"
                checked={selected.includes(t)}
                onChange={() => toggle(t)}
              />
              <span>{TYPE_LABELS[t]}</span>
            </label>
          ))}
          {selected.length > 0 && selected.length < ALL_TYPES.length && (
            <button type="button" className="type-clear" onClick={() => onChange([])}>
              Сбросить
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function BookCard({ book }: { book: Book }) {
  const navigate = useNavigate()
  return (
    <article className="book-card" onClick={() => navigate(`/books/${book.slug}`)}>
      <div className="card-badge">
        <BookOpen size={18} />
      </div>
      <h3 className="card-title">
        <Link to={`/books/${book.slug}`}>{book.title}</Link>
      </h3>
      {book.author && <div className="card-author">{book.author}</div>}
      <div className="card-foot">
        <span className="card-subject">{book.subject}</span>
        {book.pdfUrl && (
          <a
            className="card-download"
            href={book.pdfUrl}
            download={book.pdfName ?? ''}
            onClick={(e) => e.stopPropagation()}
          >
            <Download size={14} /> Скачать
          </a>
        )}
      </div>
    </article>
  )
}

export function BooksPage() {
  const [query, setQuery] = useState('')
  const [subject, setSubject] = useState('')
  const [types, setTypes] = useState<BookType[]>([])

  const subjects = useMemo(
    () => [...new Set(books.map((b) => b.subject))].sort((a, b) => a.localeCompare(b, 'ru')),
    [],
  )

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return books.filter((b) => {
      if (subject && b.subject !== subject) return false
      // Пустой выбор — все типы; книги без типа в settings.json показываем только без фильтра
      if (types.length > 0 && (!b.type || !types.includes(b.type))) return false
      if (q && !b.title.toLowerCase().includes(q)) return false
      return true
    })
  }, [query, subject, types])

  return (
    <div className="books-page">
      <div className="books-head">
        <h1>Книги</h1>
        <p>Конспекты-пересказы и оригиналы в PDF. Нажмите на книгу, чтобы открыть конспект.</p>
      </div>

      <div className="books-toolbar">
        <div className="search-wrap books-search">
          <Search size={15} className="search-icon" />
          <input
            className="search-input"
            type="text"
            placeholder="Поиск по названию…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Поиск книги по названию"
          />
          {query && (
            <button className="search-clear" onClick={() => setQuery('')} aria-label="Очистить">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="select-wrap">
          <select
            className="books-filter"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            aria-label="Фильтр по предмету"
          >
            <option value="">Все предметы</option>
            {subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <ChevronDown size={14} />
        </div>
        <TypeFilter selected={types} onChange={setTypes} />
      </div>

      {visible.length === 0 ? (
        <div className="books-empty">По заданным условиям книг нет</div>
      ) : (
        <div className="books-grid">
          {visible.map((book) => (
            <BookCard key={book.slug} book={book} />
          ))}
        </div>
      )}
    </div>
  )
}
