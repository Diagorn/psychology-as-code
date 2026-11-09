import { ChevronDown, FolderOpen, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { materialSemesters, type MaterialsDiscipline } from '../lib/materials'

/** Русские формы числительных: plural(2, 'файл', 'файла', 'файлов') → 'файла' */
function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few
  return many
}

/** «2 файла · 3 ссылки» — используется на обзорной странице и на странице дисциплины */
export function materialsCounts(disc: MaterialsDiscipline): string {
  return [
    `${disc.files.length} ${plural(disc.files.length, 'файл', 'файла', 'файлов')}`,
    `${disc.links.length} ${plural(disc.links.length, 'ссылка', 'ссылки', 'ссылок')}`,
  ].join(' · ')
}

function DisciplineCard({ disc }: { disc: MaterialsDiscipline }) {
  const navigate = useNavigate()
  const to = `/materials/${disc.path}`
  return (
    <article className="mat-card" onClick={() => navigate(to)}>
      <div className="card-badge">
        <FolderOpen size={18} />
      </div>
      <h3 className="card-title">
        <Link to={to}>{disc.title}</Link>
      </h3>
      {disc.description && <div className="mat-card-desc">{disc.description}</div>}
      <div className="card-foot">
        <span className="mat-card-counts">{materialsCounts(disc)}</span>
        <span className="card-subject">{disc.semesterTitle}</span>
      </div>
    </article>
  )
}

export function MaterialsPage() {
  const [query, setQuery] = useState('')
  const [semester, setSemester] = useState('')

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    return materialSemesters
      .filter((s) => !semester || s.slug === semester)
      .flatMap((s) => s.disciplines)
      .filter((d) => {
        if (!q) return true
        return (
          d.title.toLowerCase().includes(q) ||
          (d.description ?? '').toLowerCase().includes(q) ||
          d.files.some((f) => f.title.toLowerCase().includes(q)) ||
          d.links.some((l) => l.title.toLowerCase().includes(q))
        )
      })
  }, [query, semester])

  // Группировка по семестрам: пустые группы не показываем
  const groups = useMemo(
    () =>
      materialSemesters
        .filter((s) => !semester || s.slug === semester)
        .map((s) => ({
          semester: s,
          disciplines: matches.filter((d) => d.semesterSlug === s.slug),
        }))
        .filter((g) => g.disciplines.length > 0),
    [matches, semester],
  )

  return (
    <div className="materials-page">
      <div className="books-head">
        <h1>Материалы</h1>
        <p>
          Файлы и ссылки по дисциплинам. Файл достаточно положить в папку дисциплины в materials —
          он появится здесь сам.
        </p>
      </div>

      <div className="books-toolbar">
        <div className="search-wrap books-search">
          <Search size={15} className="search-icon" />
          <input
            className="search-input"
            type="text"
            placeholder="Поиск по дисциплине, файлу или ссылке…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Поиск по материалам"
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
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            aria-label="Фильтр по семестру"
          >
            <option value="">Все семестры</option>
            {materialSemesters.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.title}
              </option>
            ))}
          </select>
          <ChevronDown size={14} />
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="books-empty">Материалов не найдено</div>
      ) : (
        groups.map(({ semester, disciplines }) => (
          <section key={semester.slug} className="materials-group">
            <h2 className="materials-group-title">{semester.title}</h2>
            <div className="books-grid">
              {disciplines.map((d) => (
                <DisciplineCard key={d.path} disc={d} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
