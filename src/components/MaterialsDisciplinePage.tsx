import {
  ArrowLeft,
  ArrowUpRight,
  ChevronRight,
  Download,
  File,
  FileArchive,
  FileSpreadsheet,
  FileText,
  Globe,
  Image,
  Presentation,
} from 'lucide-react'
import { useEffect } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { findMaterials, type MaterialFile, type MaterialLink } from '../lib/materials'
import { materialsCounts } from './MaterialsPage'

/** Иконка по расширению файла */
function fileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (['doc', 'docx', 'pdf', 'txt', 'md', 'rtf', 'odt'].includes(ext)) return <FileText size={16} />
  if (['ppt', 'pptx', 'odp', 'key'].includes(ext)) return <Presentation size={16} />
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) return <FileSpreadsheet size={16} />
  if (['zip', 'rar', '7z'].includes(ext)) return <FileArchive size={16} />
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return <Image size={16} />
  return <File size={16} />
}

function extensionOf(name: string): string {
  const ext = name.split('.').pop()
  return ext ? ext.toUpperCase() : 'ФАЙЛ'
}

function FileRow({ file }: { file: MaterialFile }) {
  return (
    <div className="mat-row">
      <span className="mat-row-icon">{fileIcon(file.name)}</span>
      <div className="mat-row-body">
        <a className="mat-row-name" href={file.url} target="_blank" rel="noreferrer">
          {file.title}
        </a>
        {file.description && <p className="mat-row-desc">{file.description}</p>}
      </div>
      <span className="mat-ext">{extensionOf(file.name)}</span>
      <a
        className="icon-btn mat-row-btn"
        href={file.url}
        download={file.name}
        aria-label={`Скачать: ${file.title}`}
        title="Скачать"
      >
        <Download size={15} />
      </a>
    </div>
  )
}

function LinkRow({ link }: { link: MaterialLink }) {
  let host = link.url
  try {
    host = new URL(link.url).hostname
  } catch {
    // некорректный url — показываем как есть
  }
  return (
    <a className="mat-row" href={link.url} target="_blank" rel="noreferrer">
      <span className="mat-row-icon">
        <Globe size={16} />
      </span>
      <div className="mat-row-body">
        <span className="mat-row-name">{link.title}</span>
        {link.description && <p className="mat-row-desc">{link.description}</p>}
        <span className="mat-row-url">{host}</span>
      </div>
      <span className="mat-row-go">
        <ArrowUpRight size={15} />
      </span>
    </a>
  )
}

export function MaterialsDisciplinePage() {
  const { semester, discipline } = useParams()
  const location = useLocation()
  const disc = findMaterials(semester, discipline)

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  if (!disc) {
    return (
      <div className="materials-page">
        <div className="books-empty">
          Материалы не найдены. <Link to="/materials">Вернуться к списку дисциплин</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="materials-page">
      <nav className="crumbs">
        <Link to="/materials" className="crumb-link">
          <ArrowLeft size={13} /> Материалы
        </Link>
        <ChevronRight size={12} />
        <span className="crumb-current">{disc.title}</span>
      </nav>

      <header className="mat-head">
        <h1 className="mat-title">{disc.title}</h1>
        <p className="mat-meta">
          {disc.semesterTitle} · {materialsCounts(disc)}
        </p>
        {disc.description && <p className="mat-description">{disc.description}</p>}
      </header>

      {disc.files.length === 0 && disc.links.length === 0 ? (
        <div className="books-empty">
          Материалов пока нет — положите файлы в папку дисциплины или добавьте ссылки в index.json.
        </div>
      ) : (
        <>
          {disc.files.length > 0 && (
            <section className="mat-section">
              <h2 className="mat-section-title">Файлы</h2>
              <div className="mat-list">
                {disc.files.map((f) => (
                  <FileRow key={f.name} file={f} />
                ))}
              </div>
            </section>
          )}
          {disc.links.length > 0 && (
            <section className="mat-section">
              <h2 className="mat-section-title">Ссылки</h2>
              <div className="mat-list">
                {disc.links.map((l) => (
                  <LinkRow key={l.url} link={l} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
