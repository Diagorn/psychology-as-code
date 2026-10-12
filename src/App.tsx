import { useEffect, useState } from 'react'
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import { Article } from './components/Article'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'

function Shell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  return (
    <div className="app">
      <Header menuOpen={menuOpen} onMenu={() => setMenuOpen((o) => !o)} />
      <div className="app-body">
        <Sidebar open={menuOpen} />
        {menuOpen && <div className="scrim" onClick={() => setMenuOpen(false)} />}
        <main className="main">
          <Routes>
            <Route path="/" element={<Article />} />
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
