import { ArrowLeft, ChevronRight, Download } from 'lucide-react'
import { useEffect, isValidElement, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import { Link, useLocation, useParams } from 'react-router-dom'
import remarkGfm from 'remark-gfm'
import { findBook } from '../lib/books'
import { headingId } from '../lib/bookToc'

/** Текст заголовка из React-детей (внутри могут быть code/strong) */
function textOf(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (isValidElement(node)) return textOf(node.props.children as ReactNode)
  return ''
}

/** Заголовок с якорем для оглавления книги */
function Heading(Tag: 'h2' | 'h3', { children }: { children?: ReactNode }) {
  return <Tag id={headingId(textOf(children))}>{children}</Tag>
}

export function BookArticle() {
  const { slug } = useParams()
  const location = useLocation()
  const book = findBook(slug)

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  if (!book) {
    return (
      <div className="books-page">
        <div className="books-empty">
          Книга не найдена. <Link to="/books">Вернуться к списку книг</Link>
        </div>
      </div>
    )
  }

  return (
    <article className="article">
      <nav className="crumbs">
        <Link to="/books" className="crumb-link">
          <ArrowLeft size={13} /> Книги
        </Link>
        <ChevronRight size={12} />
        <span className="crumb-current">{book.title}</span>
        {book.pdfUrl && (
          <a className="crumb-download" href={book.pdfUrl} download={book.pdfName ?? ''}>
            <Download size={13} /> PDF
          </a>
        )}
      </nav>

      {book.raw ? (
        <div className="md">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h2: (props) => Heading('h2', props),
              h3: (props) => Heading('h3', props),
            }}
          >
            {book.raw}
          </ReactMarkdown>
        </div>
      ) : (
        <p className="books-empty">Конспект этой книги ещё не написан.</p>
      )}
    </article>
  )
}
