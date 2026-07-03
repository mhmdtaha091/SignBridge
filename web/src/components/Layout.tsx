import { useState } from 'react'
import { NavLink, Outlet, Link } from 'react-router-dom'
import { useLanguageStore } from '../store/useLanguageStore'
import { LANGUAGES } from '../config/language'

const navItems = [
  { to: '/learn', label: 'Letters' },
  { to: '/words', label: 'Words' },
  { to: '/tutor', label: 'Tutor' },
  { to: '/practice', label: 'Practice' },
  { to: '/interpret', label: 'Interpret' },
  { to: '/studio', label: 'Data Studio' },
  { to: '/about', label: 'About' },
]

export default function Layout() {
  const language = useLanguageStore((s) => s.language)
  const setLanguage = useLanguageStore((s) => s.setLanguage)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-svh flex flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 bg-coral-500 text-white px-4 py-2 rounded-full font-bold"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 bg-cream-50/90 backdrop-blur border-b border-cream-200">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-extrabold text-xl text-ink-900 shrink-0">
            <span
              aria-hidden="true"
              className="grid place-items-center w-9 h-9 rounded-xl bg-coral-500 text-white text-lg shadow-soft"
            >
              🤟
            </span>
            <span className="hidden sm:inline">SignBridge</span>
          </Link>

          {/* Desktop nav (md+) */}
          <nav aria-label="Main" className="hidden md:flex items-center gap-1">
            {navItems.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-full font-bold text-sm transition-colors ${
                    isActive
                      ? 'bg-coral-100 text-coral-700'
                      : 'text-ink-700 hover:bg-cream-100 hover:text-ink-900'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Language toggle (always visible) */}
          <button
            type="button"
            onClick={() => setLanguage(language === 'asl' ? 'psl' : 'asl')}
            className="ml-auto px-2.5 py-1.5 min-h-[44px] min-w-[44px] rounded-full text-xs font-bold bg-cream-100 hover:bg-cream-200 border border-cream-200 transition-colors shrink-0"
            title={`Switch to ${language === 'asl' ? 'Pakistani Sign Language' : 'American Sign Language'}`}
          >
            {LANGUAGES[language].flag} {LANGUAGES[language].nativeName}
          </button>

          {/* Hamburger toggle (mobile only) */}
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="md:hidden min-h-[44px] min-w-[44px] grid place-items-center rounded-xl hover:bg-cream-100 transition-colors shrink-0"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            <span className="text-xl">{menuOpen ? '✕' : '☰'}</span>
          </button>
        </div>

        {/* Mobile nav panel */}
        {menuOpen && (
          <nav
            aria-label="Mobile navigation"
            className="md:hidden border-t border-cream-200 bg-cream-50 animate-slide-up"
          >
            <div className="px-4 py-3 flex flex-col gap-1">
              {navItems.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `px-4 py-3 min-h-[44px] flex items-center rounded-2xl font-bold transition-colors ${
                      isActive
                        ? 'bg-coral-100 text-coral-700'
                        : 'text-ink-700 hover:bg-cream-100 hover:text-ink-900'
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </div>
          </nav>
        )}
      </header>

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-cream-200 bg-cream-100">
        <div className="mx-auto max-w-6xl px-4 py-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between text-sm text-ink-700">
          <p>
            <strong>SignBridge</strong> is free and open source (MIT). Your camera never leaves
            your device — all recognition runs in your browser.
          </p>
          <a
            className="font-bold text-coral-700 hover:underline shrink-0"
            href="https://github.com/mhmdtaha091/SignBridge"
            target="_blank"
            rel="noreferrer"
          >
            GitHub ↗
          </a>
        </div>
      </footer>
    </div>
  )
}
