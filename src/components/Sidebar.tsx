import { ChevronRight, FileText } from 'lucide-react'
import { useEffect, useState } from 'react'
import { matchPath, NavLink, useLocation } from 'react-router-dom'
import { semesters } from '../lib/content'

/** pathname из useLocation остаётся закодированным (браузер кодирует кириллицу в hash),
 * а <Routes> внутри матчится по декодированному пути — приводим параметры к виду имён папок */
function decodeParam(value: string | undefined): string | undefined {
  if (!value) return undefined
  try {
    return decodeURIComponent(value)
  } catch {
    return value // битые %-последовательности — отдаём как есть
  }
}

export function Sidebar({ open }: { open: boolean }) {
  // Компонент живёт вне <Routes>, useParams() здесь пуст — берём ветку из pathname
  const { pathname } = useLocation()
  const branch = matchPath('/:semester/:discipline/:lecture', pathname)?.params
  const semester = decodeParam(branch?.semester)
  const discipline = decodeParam(branch?.discipline)
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(semesters.length ? [`s:${semesters[0]!.slug}`] : []),
  )

  // Автоматически раскрываем ветку активной лекции
  useEffect(() => {
    if (!semester || !discipline) return
    setExpanded((prev) => {
      const next = new Set(prev)
      next.add(`s:${semester}`)
      next.add(`d:${semester}/${discipline}`)
      return next
    })
  }, [semester, discipline])

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  return (
    <aside className={open ? 'sidebar open' : 'sidebar'}>
      <nav className="tree" aria-label="Дерево конспектов">
        {semesters.map((sem) => {
          const semOpen = expanded.has(`s:${sem.slug}`)
          return (
            <section key={sem.slug} className="tree-group">
              <button className="tree-row tree-semester" onClick={() => toggle(`s:${sem.slug}`)}>
                <ChevronRight size={14} className={semOpen ? 'chev open' : 'chev'} />
                <span>{sem.title}</span>
              </button>
              {semOpen && (
                <div className="tree-children">
                  {sem.disciplines.map((disc) => {
                    const key = `d:${sem.slug}/${disc.slug}`
                    const discOpen = expanded.has(key)
                    return (
                      <div key={disc.slug}>
                        <button className="tree-row tree-disc" onClick={() => toggle(key)}>
                          <ChevronRight size={13} className={discOpen ? 'chev open' : 'chev'} />
                          <span>{disc.title}</span>
                          <span className="tree-count">{disc.lectures.length}</span>
                        </button>
                        {discOpen && (
                          <div className="tree-children">
                            {disc.lectures.map((lec) => (
                              <NavLink
                                key={lec.slug}
                                to={`/${lec.path}`}
                                className={({ isActive }) =>
                                  isActive ? 'tree-row tree-lecture active' : 'tree-row tree-lecture'
                                }
                              >
                                <FileText size={13.5} />
                                <span>{lec.title}</span>
                              </NavLink>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          )
        })}
        {semesters.length === 0 && (
          <p className="tree-empty">Добавьте markdown-файлы в папку content/</p>
        )}
      </nav>
    </aside>
  )
}
