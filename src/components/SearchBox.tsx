import { FileText, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchNotes, type Range, type SearchHit } from '../lib/search'

function Highlight({ text, ranges }: { text: string; ranges: Range[] }) {
  if (ranges.length === 0) return <>{text}</>
  const parts: ReactNode[] = []
  let cursor = 0
  ranges.forEach(([start, end], i) => {
    if (start < cursor) return
    if (start > cursor) parts.push(text.slice(cursor, start))
    parts.push(<mark key={i}>{text.slice(start, end + 1)}</mark>)
    cursor = end + 1
  })
  if (cursor < text.length) parts.push(text.slice(cursor))
  return <>{parts}</>
}

export function SearchBox() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const results = useMemo(() => searchNotes(query), [query])
  const visible = open && query.trim().length >= 2

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const inField = target && ['INPUT', 'TEXTAREA'].includes(target.tagName)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      } else if (e.key === '/' && !inField) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => setActive(0), [query])

  const go = (hit: SearchHit) => {
    setOpen(false)
    setQuery('')
    inputRef.current?.blur()
    navigate(`/${hit.doc.lecture.path}`)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      if (results[active]) go(results[active])
    } else if (e.key === 'Escape') {
      if (query) setQuery('')
      else {
        setOpen(false)
        inputRef.current?.blur()
      }
    }
  }

  return (
    <div className="search" ref={boxRef}>
      <div className="search-wrap">
        <Search size={15} className="search-icon" />
        <input
          ref={inputRef}
          className="search-input"
          type="text"
          placeholder="Поиск по конспектам…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={visible}
          aria-label="Поиск по конспектам"
        />
        {query ? (
          <button
            className="search-clear"
            onClick={() => {
              setQuery('')
              inputRef.current?.focus()
            }}
            aria-label="Очистить"
          >
            <X size={14} />
          </button>
        ) : (
          <kbd className="search-kbd">Ctrl K</kbd>
        )}
      </div>

      {visible && (
        <div className="search-pop">
          {results.length === 0 ? (
            <div className="search-empty">По запросу «{query.trim()}» ничего не найдено</div>
          ) : (
            results.map((hit, i) => (
              <button
                key={hit.doc.lecture.path}
                className={i === active ? 'search-item active' : 'search-item'}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault()
                  go(hit)
                }}
              >
                <span className="search-item-title">
                  <FileText size={14} />
                  <Highlight text={hit.doc.title} ranges={hit.titleRanges} />
                </span>
                <span className="search-item-where">{hit.doc.where}</span>
                {hit.snippet && (
                  <span className="search-item-snippet">
                    <Highlight text={hit.snippet} ranges={hit.snippetRanges} />
                  </span>
                )}
              </button>
            ))
          )}
          <div className="search-hints">
            <span>
              <kbd>↑</kbd>
              <kbd>↓</kbd> навигация
            </span>
            <span>
              <kbd>↵</kbd> открыть
            </span>
            <span>
              <kbd>esc</kbd> закрыть
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
