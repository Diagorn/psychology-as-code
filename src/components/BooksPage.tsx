import { BookOpen, ChevronDown, Download, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { books, type Book } from '../lib/books'

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

  const subjects = useMemo(
    () => [...new Set(books.map((b) => b.subject))].sort((a, b) => a.localeCompare(b, 'ru')),
    [],
  )

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return books.filter((b) => {
      if (subject && b.subject !== subject) return false
      if (q && !b.title.toLowerCase().includes(q)) return false
      return true
    })
  }, [query, subject])

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
