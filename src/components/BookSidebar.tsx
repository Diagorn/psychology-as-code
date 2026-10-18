import { ChevronRight, FileText } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { matchPath, useLocation } from 'react-router-dom'
import { findBook } from '../lib/books'
import { parseBookToc } from '../lib/bookToc'

/** Отступ от верха страницы: высота шапки из CSS-переменной + запас */
function scrollOffset(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--header-h')
  const h = parseFloat(raw)
  return (Number.isFinite(h) ? h : 60) + 24
}

/** pathname из useLocation остаётся закодированным (браузер кодирует кириллицу в hash),
 * а <Routes> внутри матчится по декодированному пути — приводим параметр к виду имён папок */
function decodeParam(value: string | undefined): string | undefined {
  if (!value) return undefined
  try {
    return decodeURIComponent(value)
  } catch {
    return value // битые %-последовательности — отдаём как есть
  }
}

export function BookSidebar({ open, onNavigate }: { open: boolean; onNavigate?: () => void }) {
  // Компонент живёт вне <Routes>, useParams() здесь пуст — достаём slug из pathname
  const { pathname } = useLocation()
  const book = findBook(decodeParam(matchPath('/books/:slug', pathname)?.params.slug))
  const toc = useMemo(() => (book?.raw ? parseBookToc(book.raw) : []), [book])
  const items = useMemo(() => toc.flatMap((p) => [p, ...p.children]), [toc])

  const [activeId, setActiveId] = useState<string | null>(null)
  const [openPart, setOpenPart] = useState<string | null>(null)

  // Отслеживаем прокрутку: подсвечиваем раздел, на котором сейчас читатель
  useEffect(() => {
    if (!items.length) {
      setActiveId(null)
      return
    }
    let frame = 0
    const compute = () => {
      frame = 0
      const offset = scrollOffset()
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4
      let current: string | null = atBottom ? items[items.length - 1]!.id : items[0]!.id
      for (const item of items) {
        const el = document.getElementById(item.id)
        if (!el) continue
        if (el.getBoundingClientRect().top > offset) break
        current = item.id
      }
      setActiveId(current)
    }
    const request = () => {
      if (!frame) frame = requestAnimationFrame(compute)
    }
    compute()
    const timer = window.setTimeout(compute, 80) // после автопрокрутки статьи к началу
    window.addEventListener('scroll', request, { passive: true })
    window.addEventListener('resize', request)
    return () => {
      window.removeEventListener('scroll', request)
      window.removeEventListener('resize', request)
      if (frame) cancelAnimationFrame(frame)
      window.clearTimeout(timer)
    }
  }, [items, pathname])

  // Держим раскрытой только одну часть — ту, где сейчас читатель:
  // при скролле в новую часть прежняя закрывается, новая открывается
  useEffect(() => {
    if (!activeId) return
    const owner = toc.find((p) => p.id === activeId || p.children.some((c) => c.id === activeId))
    if (owner) setOpenPart(owner.id)
  }, [activeId, toc])

  const toggle = (partId: string) => setOpenPart((prev) => (prev === partId ? null : partId))

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    onNavigate?.()
  }

  if (!toc.length) return null

  return (
    <aside className={open ? 'sidebar open' : 'sidebar'}>
      <nav className="tree" aria-label="Оглавление книги">
        <p className="tree-heading">Оглавление</p>
        {toc.map((part) => {
          const partOpen = openPart === part.id
          const partActive = activeId === part.id
          const containsActive = part.children.some((c) => c.id === activeId)
          const partClass = [
            'tree-row',
            'tree-semester',
            'tree-part',
            partActive ? 'active' : '',
            containsActive ? 'current' : '',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <section key={part.id} className="tree-group">
              <button
                className={partClass}
                onClick={() => (part.children.length ? toggle(part.id) : scrollTo(part.id))}
              >
                {part.children.length > 0 && (
                  <ChevronRight size={14} className={partOpen ? 'chev open' : 'chev'} />
                )}
                <span>{part.title}</span>
                {part.children.length > 0 && (
                  <span className="tree-count">{part.children.length}</span>
                )}
              </button>
              {partOpen && (
                <div className="tree-children">
                  {part.children.map((chapter) => (
                    <button
                      key={chapter.id}
                      className={
                        activeId === chapter.id
                          ? 'tree-row tree-lecture active'
                          : 'tree-row tree-lecture'
                      }
                      onClick={() => scrollTo(chapter.id)}
                      aria-current={activeId === chapter.id ? 'location' : undefined}
                    >
                      <FileText size={13.5} />
                      <span>{chapter.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </nav>
    </aside>
  )
}
