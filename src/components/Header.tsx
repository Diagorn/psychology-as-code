import { BookOpenText, Menu, Moon, Sun, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SearchBox } from './SearchBox'

export function Header({ menuOpen, onMenu }: { menuOpen: boolean; onMenu: () => void }) {
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
  )

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem('theme', next)
    } catch {
      // приватный режим — просто не сохраняем
    }
    setTheme(next)
  }

  return (
    <header className="header">
      <button className="icon-btn menu-btn" onClick={onMenu} aria-label="Меню">
        {menuOpen ? <X size={18} /> : <Menu size={18} />}
      </button>
      <Link to="/" className="brand">
        <span className="brand-badge">
          <BookOpenText size={16} />
        </span>
        <span className="brand-name">
          Конспекты<span className="brand-sub"> · психология</span>
        </span>
      </Link>
      <div className="header-right">
        <SearchBox />
        <button
          className="icon-btn"
          onClick={toggleTheme}
          aria-label="Сменить тему"
          title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>
    </header>
  )
}
