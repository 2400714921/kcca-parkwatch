import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Icon } from './ui'

export default function Sidebar({
  auth,
  onLogout,
  theme,
  onToggleTheme,
  selectedArea,
  parkingAreas = [],
  availability = {},
  mobileOpen: controlledMobileOpen,
  onCloseMobile,
  onOpenLoginModal,
  onOpenProfileModal,
  onSwitchRole,
}) {
  const [internalMobileOpen, setInternalMobileOpen] = useState(false)
  const isMobileOpen = controlledMobileOpen !== undefined ? controlledMobileOpen : internalMobileOpen
  const closeMobile = () => {
    if (onCloseMobile) onCloseMobile()
    setInternalMobileOpen(false)
  }

  const location = useLocation()
  const navigate = useNavigate()

  const isDashboard = location.pathname === '/dashboard' || location.pathname === '/dashboard/'
  const isUsers = location.pathname === '/dashboard/users'
  const isProfile = location.pathname === '/dashboard/profile'
  const isPayments = location.pathname.startsWith('/dashboard/payments') || location.pathname.startsWith('/dashboard/pay')
  const isFacilities = location.pathname.startsWith('/dashboard/monitor') || location.pathname.startsWith('/dashboard/facilities')
  const isAreaDetails = location.pathname.includes('/areas/')
  const isAdmin = auth?.role === 'admin'
  const isMotorist = auth?.role === 'motorist'
  const isWarden = auth?.role === 'warden'
  const isGuest = !auth?.token

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-[#0b0f19] border-r border-slate-200 dark:border-slate-800 transition-colors print:hidden">
      {/* Brand & Console Title */}
      <div className="p-space-lg flex flex-col gap-space-sm">
        <div className="flex items-center gap-space-md">
          <div className="h-12 w-16 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 flex items-center justify-center shadow-xs shrink-0 overflow-hidden">
            <img src="/logo.jpg" alt="KCCA Logo" className="h-full w-full object-contain" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-headline-sm text-sm font-black text-slate-900 dark:text-white tracking-tight truncate">
              KCCA ParkWatch
            </span>
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-800 dark:text-emerald-400">
              {isGuest ? 'Civic Portal' : isMotorist ? 'Driver Portal' : isWarden ? 'Attendant Console' : 'Owner Console'}
            </span>
          </div>
        </div>
        {/* Tricolor ribbon */}
        <div className="h-1 w-full flex rounded-full overflow-hidden mt-1">
          <div className="w-1/3 bg-emerald-700" />
          <div className="w-1/3 bg-amber-500" />
          <div className="w-1/3 bg-red-600" />
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-space-md py-space-sm flex flex-col gap-4 overflow-y-auto">
        {isGuest ? (
          <div className="flex flex-col gap-1">
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Civic Navigation
            </div>
            <button
              onClick={() => {
                navigate('/dashboard/payments')
                closeMobile()
              }}
              data-testid="nav-payments-btn"
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors cursor-pointer ${
                isPayments
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 font-medium'
              }`}
            >
              <Icon name="credit_card" size={18} className="shrink-0" />
              <span className="truncate">Payments &amp; Passes</span>
            </button>

            <button
              onClick={() => {
                navigate('/')
                closeMobile()
              }}
              data-testid="nav-civic-portal-btn"
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors cursor-pointer ${
                location.pathname === '/'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 font-medium'
              }`}
            >
              <Icon name="home" size={18} className="shrink-0" />
              <span className="truncate">Public Civic Portal</span>
            </button>

            {isAreaDetails && (
              <div className="px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 font-semibold text-xs flex items-center gap-2">
                <Icon name="info" size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="truncate">Facility Details View</span>
              </div>
            )}
          </div>
        ) : isMotorist ? (
          <div className="flex flex-col gap-1">
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Citizen Navigation
            </div>
            <button
              onClick={() => {
                navigate('/dashboard')
                closeMobile()
              }}
              data-testid="nav-dashboard-btn"
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors cursor-pointer ${
                isDashboard
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 font-medium'
              }`}
            >
              <Icon name="dashboard" size={18} className="shrink-0" />
              <span className="truncate">Motorist Dashboard</span>
            </button>

            <button
              onClick={() => {
                navigate('/dashboard/payments')
                closeMobile()
              }}
              data-testid="nav-payments-btn"
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors cursor-pointer ${
                isPayments
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 font-medium'
              }`}
            >
              <Icon name="credit_card" size={18} className="shrink-0" />
              <span className="truncate">Payments &amp; Passes</span>
            </button>

            {onOpenProfileModal && (
              <button
                onClick={() => {
                  onOpenProfileModal()
                  closeMobile()
                }}
                data-testid="nav-profile-btn"
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors cursor-pointer ${
                  isProfile
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 font-medium'
                }`}
              >
                <Icon name="person" size={18} className="shrink-0" />
                <span className="truncate">My Profile</span>
              </button>
            )}

            {isAreaDetails && (
              <div className="px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 font-semibold text-xs flex items-center gap-2">
                <Icon name="info" size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="truncate">Facility Details View</span>
              </div>
            )}
          </div>
        ) : isWarden ? (
          <div className="flex flex-col gap-1">
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Parking Attendant
            </div>
            <button
              onClick={() => {
                navigate('/dashboard')
                closeMobile()
              }}
              data-testid="nav-dashboard-btn"
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors cursor-pointer ${
                isDashboard
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 font-medium'
              }`}
            >
              <Icon name="search" size={18} className="shrink-0" />
              <span className="truncate">Verify Number Plate</span>
            </button>

            <button
              onClick={() => {
                navigate('/dashboard/payments')
                closeMobile()
              }}
              data-testid="nav-payments-btn"
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors cursor-pointer ${
                isPayments
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 font-medium'
              }`}
            >
              <Icon name="credit_card" size={18} className="shrink-0" />
              <span className="truncate">Area Payments</span>
            </button>

            {onOpenProfileModal && (
              <button
                onClick={() => {
                  onOpenProfileModal()
                  closeMobile()
                }}
                data-testid="nav-profile-btn"
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors cursor-pointer ${
                  isProfile
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 font-medium'
                }`}
              >
                <Icon name="person" size={18} className="shrink-0" />
                <span className="truncate">My Profile</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Operations Dashboard Link */}
            <div className="flex flex-col gap-1">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Console
              </div>
              <button
                onClick={() => {
                  navigate('/dashboard')
                  closeMobile()
                }}
                data-testid="nav-dashboard-btn"
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors cursor-pointer ${
                  isDashboard
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 font-medium'
                }`}
              >
                <Icon name="dashboard" size={18} className="shrink-0" />
                <span className="truncate">Operations Dashboard</span>
              </button>

              {/* User Management Link (Admin role only) */}
              {isAdmin && (
                <button
                  onClick={() => {
                    navigate('/dashboard/users')
                    closeMobile()
                  }}
                  data-testid="nav-user-management-btn"
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-sm transition-colors cursor-pointer ${
                    isUsers
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon name="manage_accounts" size={18} className="shrink-0" />
                    <span className="truncate">User Management</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 shrink-0">
                    Admin
                  </span>
                </button>
              )}

              {/* Parking Facilities Link (replaces congested per-area Live Monitor list) */}
              <button
                onClick={() => {
                  navigate('/dashboard/monitor')
                  closeMobile()
                }}
                data-testid="nav-parking-facilities-btn"
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-sm transition-colors cursor-pointer ${
                  isFacilities
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon name="local_parking" size={18} className="shrink-0" />
                  <span className="truncate">{isAdmin ? 'Parking Facilities' : 'My Parking Facilities'}</span>
                </div>
                <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-semibold text-slate-600 dark:text-slate-400 tabular-nums shrink-0">
                  {parkingAreas.length}
                </span>
              </button>

              {/* My Attendants Link (ParkingArea Owner & Admin) */}
              <button
                onClick={() => {
                  navigate('/dashboard/attendants')
                  closeMobile()
                }}
                data-testid="nav-attendants-btn"
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors cursor-pointer ${
                  location.pathname.startsWith('/dashboard/attendants')
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 font-medium'
                }`}
              >
                <Icon name="group" size={18} className="shrink-0" />
                <span className="truncate">{isAdmin ? 'Parking Attendants' : 'My Attendants'}</span>
              </button>

              {/* Payments & Plate Enforcement Link */}
              <button
                onClick={() => {
                  navigate('/dashboard/payments')
                  closeMobile()
                }}
                data-testid="nav-payments-btn"
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors cursor-pointer ${
                  isPayments
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 font-medium'
                }`}
              >
                <Icon name="credit_card" size={18} className="shrink-0" />
                <span className="truncate">Payments</span>
              </button>

              {/* My Profile Link */}
              {onOpenProfileModal && (
                <button
                  onClick={() => {
                    onOpenProfileModal()
                    closeMobile()
                  }}
                  data-testid="nav-profile-btn"
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors cursor-pointer ${
                    isProfile
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 font-medium'
                  }`}
                >
                  <Icon name="person" size={18} className="shrink-0" />
                  <span className="truncate">My Profile</span>
                </button>
              )}
            </div>
          </>
        )}
      </nav>

      {/* Session & Controls Footer */}
      <div className="p-space-md border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2 bg-slate-50/50 dark:bg-slate-900/40">
        {!isGuest && Array.isArray(auth?.roles) && auth.roles.length > 1 && onSwitchRole && (
          <div className="p-2 rounded-lg bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 flex flex-col gap-1.5" data-testid="role-switcher">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
              Switch Role
            </span>
            <div className="flex flex-wrap gap-1">
              {auth.roles.map((r) => {
                const label =
                  r === 'admin'
                    ? 'City Admin'
                    : r === 'operator'
                    ? 'ParkingArea Owner'
                    : r === 'warden'
                    ? 'Attendant'
                    : 'Driver'
                const active = auth.role === r
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      onSwitchRole(r)
                      closeMobile()
                    }}
                    data-testid={`switch-role-${r}`}
                    className={`flex-1 min-w-[45%] py-1 px-2 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                      active
                        ? 'bg-emerald-700 text-white'
                        : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            navigate('/')
            closeMobile()
          }}
          data-testid="nav-back-to-website-btn"
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-xs font-semibold cursor-pointer"
        >
          <Icon name="home" size={15} />
          <span>Back to Website</span>
        </button>

        {isGuest ? (
          <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold text-xs shadow-xs shrink-0">
                G
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  Guest Citizen
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  Public Visitor
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (onOpenLoginModal) onOpenLoginModal({ initialMode: 'signin' })
                closeMobile()
              }}
              data-testid="sidebar-signin-btn"
              className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs cursor-pointer shadow-xs transition-colors shrink-0"
            >
              Sign In
            </button>
          </div>
        ) : (
          /* User Profile Card */
          <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border font-bold text-xs ${
                  isMotorist
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                    : isAdmin
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                    : 'bg-blue-100 dark:bg-blue-900/80 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                }`}
              >
                {auth?.username ? auth.username[0].toUpperCase() : 'U'}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {auth?.displayName || auth?.username || 'User'}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                  <span>
                    {isMotorist
                      ? 'Driver'
                      : isAdmin
                      ? 'City Admin'
                      : isWarden
                      ? 'Parking Attendant'
                      : 'ParkingArea Owner'}
                  </span>
                </span>
              </div>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Online" />
          </div>
        )}

        {/* Action Buttons: Theme Toggle & Logout */}
        <div className={isGuest ? 'grid grid-cols-1' : 'grid grid-cols-2 gap-2'}>
          <button
            data-testid="theme-toggle-btn"
            onClick={onToggleTheme}
            className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-xs font-semibold cursor-pointer"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <>
                <svg className="w-4 h-4 fill-current text-amber-400" viewBox="0 0 24 24">
                  <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z" />
                </svg>
                <span>Light</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 fill-current text-slate-700" viewBox="0 0 24 24">
                  <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z" />
                </svg>
                <span>Dark</span>
              </>
            )}
          </button>

          {!isGuest && (
            <button
              onClick={onLogout}
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-red-50 dark:hover:bg-red-950/60 hover:text-red-700 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800 transition-colors text-xs font-semibold cursor-pointer"
              title="Sign Out of Console"
            >
              <Icon name="logout" size={16} />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Backdrop & Off-Canvas Drawer (Opened via DashboardHeader hamburger on mobile) */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={closeMobile}
          />
          <aside data-testid="mobile-sidebar-drawer" className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 flex flex-col bg-white dark:bg-[#0b0f19]">
            <div className="absolute top-3 right-3 z-20">
              <button
                onClick={closeMobile}
                className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-200"
                aria-label="Close navigation menu"
              >
                <Icon name="close" size={18} />
              </button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop Fixed/Permanent Left Sidebar */}
      <aside
        data-testid="operator-sidebar"
        className="hidden lg:flex flex-col w-64 xl:w-72 h-screen shrink-0 sticky top-0"
      >
        {sidebarContent}
      </aside>
    </>
  )
}
