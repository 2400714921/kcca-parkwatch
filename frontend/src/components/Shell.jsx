import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Icon } from './ui'

export function Header({ auth, onLogout, theme, onToggleTheme, onOpenLoginModal, isAuthModalOpen }) {
  if (isAuthModalOpen) return null

  const loggedIn = Boolean(auth.token)
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  const handleHomeClick = () => {
    setMobileMenuOpen(false)
    if (location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      navigate('/')
    }
  }

  const handleParkingSpotsClick = () => {
    setMobileMenuOpen(false)
    if (location.pathname === '/') {
      const el = document.getElementById('parking-spots')
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else {
        window.scrollTo({ top: 600, behavior: 'smooth' })
      }
    } else {
      navigate('/')
      setTimeout(() => {
        const el = document.getElementById('parking-spots')
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }

  const isHomeActive = location.pathname === '/'

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-[#070f1e]/95 dark:bg-[#070f1e]/95 backdrop-blur-md border-b border-slate-800/80 shadow-md transition-colors text-white">
      <div className="h-16 sm:h-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
        {/* Brand Logo & Title */}
        <button
          onClick={handleHomeClick}
          className="flex items-center gap-2.5 sm:gap-3.5 text-left shrink-0 group cursor-pointer focus:outline-none min-w-0"
        >
          <div className="h-10 w-12 sm:h-12 sm:w-14 rounded-xl bg-white p-1 sm:p-1.5 flex items-center justify-center shadow-sm shrink-0 overflow-hidden border border-slate-200">
            <img src="/logo.jpg" alt="KCCA Logo" className="h-full w-full object-contain" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-base sm:text-lg font-extrabold text-white tracking-tight group-hover:text-amber-400 transition-colors truncate">
                KCCA ParkWatch
              </span>
              <span className="px-1.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[9px] uppercase font-bold hidden sm:inline">
                Civic Portal
              </span>
            </div>
            <span className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-wider font-semibold truncate">
              Kampala Capital City
            </span>
          </div>
        </button>

        {/* Desktop Nav: Home, Parking spots, [Dashboard if auth], Login CTA */}
        <div className="hidden md:flex items-center gap-3">
          <nav className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={handleHomeClick}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                isHomeActive
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-200 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              Home
            </button>

            <button
              onClick={handleParkingSpotsClick}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer text-slate-200 hover:text-white hover:bg-slate-800/70"
            >
              Parking Spots
            </button>

            {loggedIn ? (
              <div className="flex items-center gap-2 pl-1">
                {loggedIn && (
                  <button
                    onClick={() => navigate('/dashboard')}
                    data-testid="header-dashboard-btn"
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                      location.pathname.startsWith('/dashboard')
                        ? 'bg-emerald-700 text-white'
                        : 'bg-emerald-700 hover:bg-emerald-600 text-white shadow-xs'
                    }`}
                  >
                    <Icon name="dashboard" size={15} />
                    <span>{auth?.role === 'motorist' ? 'My Dashboard' : 'Dashboard'}</span>
                  </button>
                )}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-amber-300 text-xs font-semibold">
                  <Icon name="person" size={14} className="text-amber-400" />
                  <span className="max-w-[14ch] truncate">{auth?.displayName || auth?.username}</span>
                  <span className="text-[10px] uppercase font-semibold text-slate-400">
                    ({auth?.role || 'user'})
                  </span>
                </div>
                <button
                  onClick={onLogout}
                  title="Sign out"
                  data-testid="header-logout-btn"
                  className="h-8 px-2.5 rounded-lg bg-slate-800/90 hover:bg-red-950/60 hover:text-red-400 border border-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Icon name="logout" size={14} />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 pl-1">
                <button
                  onClick={() => onOpenLoginModal && onOpenLoginModal({ initialMode: 'signin' })}
                  data-testid="header-signin-btn"
                  className="px-3.5 py-1.5 rounded-lg text-slate-200 hover:text-white hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={() => onOpenLoginModal && onOpenLoginModal({ initialMode: 'signup' })}
                  data-testid="header-signup-btn"
                  className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <span>Sign Up Free</span>
                </button>
              </div>
            )}
          </nav>

          <div className="flex items-center gap-2 pl-2 shrink-0 border-l border-slate-800">
            {/* Theme Switcher Toggle */}
            <button
              onClick={onToggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="h-9 w-9 rounded-full bg-slate-800/90 border border-slate-700 text-amber-400 flex items-center justify-center hover:bg-slate-700 transition-colors cursor-pointer"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <svg className="w-4.5 h-4.5 fill-current text-amber-400" viewBox="0 0 24 24">
                  <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z" />
                </svg>
              ) : (
                <svg className="w-4.5 h-4.5 fill-current text-slate-300" viewBox="0 0 24 24">
                  <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Action Controls: Theme toggle + Hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={onToggleTheme}
            className="h-8 w-8 rounded-lg bg-slate-800 border border-slate-700 text-amber-400 flex items-center justify-center cursor-pointer"
            aria-label="Toggle theme"
          >
            <Icon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} size={16} />
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="civic-mobile-hamburger"
            className="h-10 w-10 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 hover:text-amber-300 flex items-center justify-center cursor-pointer focus:outline-none transition-colors shadow-xs"
            aria-label="Toggle navigation menu"
          >
            <Icon name={mobileMenuOpen ? 'close' : 'menu'} size={22} />
          </button>
        </div>
      </div>

      {/* Mobile Slide-Down Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden w-full bg-[#070f1e] border-b border-slate-800 px-4 py-4 flex flex-col gap-2 shadow-2xl">
          <button
            onClick={handleHomeClick}
            className={`w-full text-left px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2.5 ${
              isHomeActive ? 'bg-emerald-700 text-white' : 'text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Icon name="home" size={18} />
            <span>Home</span>
          </button>

          <button
            onClick={handleParkingSpotsClick}
            className="w-full text-left px-4 py-2.5 rounded-lg font-semibold text-sm text-slate-200 hover:bg-slate-800 flex items-center gap-2.5"
          >
            <Icon name="local_parking" size={18} />
            <span>Parking Spots &amp; Map</span>
          </button>

          {loggedIn ? (
            <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
              <div className="px-4 py-2 flex items-center justify-between text-xs font-semibold text-amber-300 bg-slate-900/80 rounded-lg border border-slate-800">
                <div className="flex items-center gap-2 truncate">
                  <Icon name="person" size={16} />
                  <span className="truncate">{auth?.displayName || auth?.username}</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-950 text-emerald-300 border border-emerald-800">
                  {auth?.role || 'motorist'}
                </span>
              </div>
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  navigate('/dashboard')
                }}
                data-testid="mobile-drawer-dashboard-btn"
                className="w-full text-left px-4 py-2.5 rounded-lg font-semibold text-sm bg-emerald-700 hover:bg-emerald-600 text-white cursor-pointer flex items-center justify-between shadow-xs"
              >
                <span className="flex items-center gap-2">
                  <Icon name="dashboard" size={17} />
                  <span>{auth?.role === 'motorist' ? 'My Motorist Dashboard' : 'Operator Dashboard'}</span>
                </span>
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  if (onLogout) onLogout()
                }}
                className="w-full text-left px-4 py-2.5 rounded-lg font-semibold text-sm bg-slate-800 text-red-400 hover:bg-slate-700 cursor-pointer flex items-center gap-2"
              >
                <Icon name="logout" size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 pt-1 border-t border-slate-800/80">
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  if (onOpenLoginModal) onOpenLoginModal({ initialMode: 'signup' })
                  else navigate('/login')
                }}
                className="w-full text-center px-4 py-2.5 rounded-lg font-semibold text-sm bg-emerald-700 hover:bg-emerald-600 text-white shadow-sm cursor-pointer flex items-center justify-center gap-2"
              >
                <Icon name="person_add" size={16} />
                <span>Create Free Account</span>
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  if (onOpenLoginModal) onOpenLoginModal({ initialMode: 'signin' })
                  else navigate('/login')
                }}
                className="w-full text-center px-4 py-2.5 rounded-lg font-semibold text-sm bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 cursor-pointer flex items-center justify-center gap-2"
              >
                <Icon name="login" size={16} />
                <span>Sign In</span>
              </button>
            </div>
          )}
        </div>
      )}
      {/* Brand tricolor accent bar */}
      <div className="h-1 w-full flex">
        <div className="w-1/3 bg-emerald-600" />
        <div className="w-1/3 bg-amber-400" />
        <div className="w-1/3 bg-red-600" />
      </div>
    </header>
  )
}

export function Footer() {
  return (
    <footer className="w-full bg-slate-900 text-slate-300 py-space-xl mt-auto border-t-4 border-emerald-700">
      <div className="max-w-7xl mx-auto px-margin md:px-margin-md lg:px-margin-lg">
        <div className="flex flex-col md:flex-row items-start justify-between gap-space-xl pb-space-lg border-b border-slate-800">
          <div className="flex items-start gap-space-md max-w-sm">
            <div className="h-14 w-18 rounded-lg bg-white p-1 flex items-center justify-center shadow-xs shrink-0">
              <img src="/logo.jpg" alt="KCCA Logo" className="h-full w-full object-contain" />
            </div>
            <div>
              <span className="font-headline-sm text-headline-sm text-white font-extrabold tracking-tight">
                Kampala Capital City Authority
              </span>
              <p className="font-label-caps text-label-caps text-emerald-400 uppercase tracking-wider font-semibold mt-0.5">
                For a better City
              </p>
              <p className="font-body-sm text-body-sm text-slate-400 mt-2">
                Directorate of Engineering &amp; Technical Services. City Hall, Plot 1-3, Apollo Kaggwa Road, P.O. Box 7010, Kampala.
              </p>
              <div className="flex flex-wrap items-center gap-space-md mt-space-sm text-slate-300 font-label-md text-label-md">
                <span className="flex items-center gap-1">
                  <Icon name="phone_in_talk" size={16} className="text-emerald-400" />
                  Toll-Free: 0800 990 000
                </span>
                <span className="flex items-center gap-1">
                  <Icon name="call" size={16} className="text-amber-400" />
                  Direct: +256 414 900 000
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-space-xl text-slate-400 font-body-sm text-body-sm">
            <div className="flex flex-col gap-space-xs">
              <span className="font-label-md text-label-md text-white font-bold uppercase tracking-wider">
                Civic Services
              </span>
              <span className="hover:text-white transition-colors cursor-pointer">Urban Mobility</span>
              <span className="hover:text-white transition-colors cursor-pointer">Smart Parking Network</span>
              <span className="hover:text-white transition-colors cursor-pointer">Municipal Infrastructure</span>
            </div>
            <div className="flex flex-col gap-space-xs">
              <span className="font-label-md text-label-md text-white font-bold uppercase tracking-wider">
                Legal &amp; Policy
              </span>
              <span className="hover:text-white transition-colors cursor-pointer">Terms of Service</span>
              <span className="hover:text-white transition-colors cursor-pointer">Privacy Policy</span>
              <span className="hover:text-white transition-colors cursor-pointer">Traffic Ordinance</span>
            </div>
            <div className="flex flex-col gap-space-xs col-span-2 sm:col-span-1">
              <span className="font-label-md text-label-md text-white font-bold uppercase tracking-wider">
                System Status
              </span>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-emerald-400 font-mono text-xs w-fit">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Automated Bay Monitoring
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-space-sm pt-space-md text-slate-400 font-body-sm text-body-sm">
          <span>&copy; {new Date().getFullYear()} Kampala Capital City Authority (KCCA). All rights reserved. Transforming Kampala into a vibrant, attractive &amp; sustainable city.</span>
          <span className="flex items-center gap-1 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Live Civic Sensor Network
          </span>
        </div>
      </div>
    </footer>
  )
}
