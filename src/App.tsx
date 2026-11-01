import { useEffect, useState } from 'react'
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import { Article } from './components/Article'
import { BookArticle } from './components/BookArticle'
import { BookSidebar } from './components/BookSidebar'
import { BooksPage } from './components/BooksPage'
import { DeadlinesPage } from './components/DeadlinesPage'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'

function Shell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const isBooksList = location.pathname === '/books'
  const isBookArticle = location.pathname.startsWith('/books/')
  const isDeadlines = location.pathname === '/deadlines'

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  return (
    <div className="app">
      <Header menuOpen={menuOpen} onMenu={() => setMenuOpen((o) => !o)} />
      <div className="app-body">
        {isBookArticle && <BookSidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />}
        {!isBooksList && !isBookArticle && !isDeadlines && <Sidebar open={menuOpen} />}
        {menuOpen && !isBooksList && !isDeadlines && <div className="scrim" onClick={() => setMenuOpen(false)} />}
        <main className="main">
          <Routes>
            <Route path="/" element={<Article />} />
            <Route path="/books" element={<BooksPage />} />
            <Route path="/books/:slug" element={<BookArticle />} />
            <Route path="/deadlines" element={<DeadlinesPage />} />
            <Route path="/:semester/:discipline/:lecture" element={<Article />} />
            <Route path="*" element={<Article />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  )
}
