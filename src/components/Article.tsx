import { ArrowLeft, ArrowRight, Brain, ChevronRight, FolderTree, GraduationCap, Search } from 'lucide-react'
import { useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { Link, useLocation, useParams } from 'react-router-dom'
import remarkGfm from 'remark-gfm'
import { findLecture, lectures, semesters } from '../lib/content'

function Welcome() {
  const disciplineCount = semesters.reduce((n, s) => n + s.disciplines.length, 0)
  return (
    <div className="welcome">
      <div className="welcome-icon">
        <Brain size={40} strokeWidth={1.7} />
      </div>
      <div className="welcome-eyebrow">Конспекты магистратуры</div>
      <h1>Гештальт-подход в психологическом консультировании</h1>
      <p>
        Выберите лекцию в дереве слева.
      </p>
      <div className="welcome-tips">
        <div className="tip">
          <Search size={17} />
          <span>
            Полнотекстовый поиск по всем лекциям: <kbd>Ctrl</kbd> + <kbd>K</kbd> или <kbd>/</kbd>
          </span>
        </div>
        <div className="tip">
          <FolderTree size={17} />
          <span>Структура: семестр → дисциплина → лекция</span>
        </div>
        <div className="tip">
          <GraduationCap size={17} />
          <span>
            Семестров: {semesters.length} · Дисциплин: {disciplineCount} · Лекций: {lectures.length}
          </span>
        </div>
      </div>
    </div>
  )
}

export function Article() {
  const params = useParams()
  const location = useLocation()
  const lecture = findLecture(params.semester, params.discipline, params.lecture)

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  if (!lecture) return <Welcome />

  const index = lectures.findIndex((l) => l.path === lecture.path)
  const prev = lectures[index - 1]
  const next = lectures[index + 1]

  return (
    <article className="article">
      <nav className="crumbs">
        <span>{lecture.semesterTitle}</span>
        <ChevronRight size={12} />
        <span>{lecture.disciplineTitle}</span>
        <ChevronRight size={12} />
        <span className="crumb-current">{lecture.title}</span>
      </nav>

      <div className="md">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{lecture.raw}</ReactMarkdown>
      </div>

      <nav className="pager">
        {prev ? (
          <Link to={`/${prev.path}`} className="pager-link">
            <span className="pager-dir">
              <ArrowLeft size={13} /> Предыдущая
            </span>
            <span className="pager-title">{prev.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link to={`/${next.path}`} className="pager-link next">
            <span className="pager-dir">
              Следующая <ArrowRight size={13} />
            </span>
            <span className="pager-title">{next.title}</span>
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </article>
  )
}
