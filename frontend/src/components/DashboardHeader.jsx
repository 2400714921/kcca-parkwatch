import React, { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Icon } from './ui'

export default function DashboardHeader({
  auth,
  onLogout,
  selectedArea,
  onOpenProfileModal,
  onToggleMobileSidebar,
  onOpenLoginModal,
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfileDropdownOpen(false)
      }
    }
    if (profileDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick)
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [profileDropdownOpen])

  const getBreadcrumb = () => {
    const path = location.pathname
    if (path.includes('pay/') || path === '/dashboard/pay') {
      return {
        title: 'Pay for Parking',
        sub: 'Flutterwave test checkout & digital parking pass',
      }
    }
    if (path.includes('payments/')) {
      return {
        title: 'Payment Receipt & Details',
        sub: 'Official KCCA ParkWatch digital parking receipt',
      }
    }
    if (path.includes('payments')) {
      return {
        title: 'Payments & Passes',
        sub: 'Transaction history, digital passes, and plate verification',
      }
    }
    if (path.includes('profile')) {
      return {
        title: 'My Profile',
        sub: 'Manage your account details, contact info, and password',
      }
    }
    if (path.includes('facilities/new')) {
      return {
        title: 'Register Parking Facility',
        sub: 'Add a new municipal parking facility to the registry',
      }
    }
    if (path.includes('facilities') && path.includes('edit')) {
      return {
        title: 'Edit Parking Facility',
        sub: 'Update facility metadata, hourly rate, and photo',
      }
    }
    if (path.includes('areas')) {
      return {
        title: selectedArea ? `${selectedArea.name} Details` : 'Facility Overview & Details',
        sub: 'Live capacity, operating hours & GPS directions',
      }
    }
    if (path.includes('attendants')) {
      return {
        title: 'My Parking Attendants',
        sub: 'Assign and manage attendants for your owned parking facilities',
      }
    }
    if (path.includes('users')) {
      return {
        title: 'User & Operator Management',
        sub: 'Manage console security credentials and role access',
      }
    }
    if (path.includes('monitor')) {
      return {
        title: selectedArea ? `Live Monitor • ${selectedArea.name}` : 'Live Monitor Workspace',
        sub: selectedArea
          ? `Calibrating & monitoring ${selectedArea.name} (${selectedArea.location || 'Municipal Zone'})`
          : 'Select a municipal facility to monitor camera feeds',
      }
    }
    if (auth?.role === 'motorist') {
      return {
        title: 'Motorist Dashboard',
        sub: 'Real-time city parking bay availability & directions',
      }
    }
    return {
      title: 'Operations Dashboard',
      sub: 'City-wide facility availability & occupancy overview',
    }
  }

  const { title, sub } = getBreadcrumb()

  return (
    <header
      data-testid="dashboard-header"
      className="sticky top-0 z-30 w-full bg-white/95 dark:bg-[#0b0f19]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors print:hidden"
    >
      <div className="h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* Left: Mobile hamburger & Breadcrumbs */}
        <div className="flex items-center gap-3 min-w-0">
          {onToggleMobileSidebar && (
            <button
              type="button"
              onClick={onToggleMobileSidebar}
              data-testid="mobile-sidebar-hamburger"
              className="lg:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer shrink-0"
              aria-label="Open sidebar menu"
            >
              <Icon name="menu" size={20} />
            </button>
          )}

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-xs font-semibold">
              <span>KCCA ParkWatch</span>
              <span>/</span>
              <span className="text-slate-700 dark:text-slate-300 font-bold truncate max-w-[32ch]">
                {title}
              </span>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 truncate hidden sm:inline">
              {sub}
            </span>
          </div>
        </div>

        {/* Right: Operator Profile Menu with Dropdown, or Sign In for Guests */}
        {!auth?.token ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenLoginModal?.({ initialMode: 'signin' })}
              data-testid="dashboard-header-signin-btn"
              className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              Sign In
            </button>
          </div>
        ) : (
          <div className="relative shrink-0" ref={dropdownRef}>
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            data-testid="profile-menu-button"
            className="flex items-center gap-2.5 p-1 sm:px-3 sm:py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors cursor-pointer text-left"
            aria-label="Operator profile and session menu"
          >
            {/* Avatar Initial Circle */}
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center text-emerald-800 dark:text-emerald-300 font-bold text-xs shadow-xs">
                {auth?.username ? auth.username[0].toUpperCase() : 'O'}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#0b0f19]" />
            </div>

            <div className="hidden sm:flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate max-w-[12ch]">
                {auth?.username || 'Operator'}
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold leading-tight flex items-center gap-1">
                <span>Online</span>
                <Icon name="expand_more" size={14} className="text-slate-400 dark:text-slate-500" />
              </span>
            </div>
          </button>

          {/* Interactive Profile Dropdown Popover */}
          {profileDropdownOpen && (
            <div
              data-testid="profile-dropdown-menu"
              className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-2xl shadow-2xl z-50 overflow-hidden py-1.5 animate-in fade-in zoom-in-95 duration-150 transition-colors"
            >
              {/* Header inside dropdown */}
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center text-emerald-800 dark:text-emerald-300 font-bold text-sm shrink-0">
                  {auth?.username ? auth.username[0].toUpperCase() : 'O'}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {auth?.username || 'Operator'}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    Directorate of Engineering
                  </span>
                  <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mt-0.5">
                    ● Active Session
                  </span>
                </div>
              </div>

              {/* Action: Update Profile */}
              <div className="px-1.5 py-1">
                <button
                  data-testid="update-profile-btn"
                  onClick={() => {
                    setProfileDropdownOpen(false)
                    if (onOpenProfileModal) onOpenProfileModal()
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
                >
                  <Icon name="person" size={18} className="text-emerald-700 dark:text-emerald-400" />
                  <span>Update Profile</span>
                </button>
              </div>

              {/* Admin Action: User Management */}
              {auth?.role === 'admin' && (
                <div className="px-1.5 py-1">
                  <button
                    data-testid="dropdown-user-mgmt-btn"
                    onClick={() => {
                      setProfileDropdownOpen(false)
                      navigate('/dashboard/users')
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
                  >
                    <Icon name="manage_accounts" size={18} className="text-amber-500" />
                    <span>User Management</span>
                  </button>
                </div>
              )}

              {/* Divider */}
              <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

              {/* Action: Logout */}
              <div className="px-1.5 py-1">
                <button
                  data-testid="profile-logout-btn"
                  onClick={() => {
                    setProfileDropdownOpen(false)
                    if (onLogout) onLogout()
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors cursor-pointer"
                >
                  <Icon name="logout" size={18} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
        )}
      </div>

      {/* Subtle tricolor line */}
      <div className="h-0.5 w-full flex">
        <div className="w-1/3 bg-emerald-600" />
        <div className="w-1/3 bg-amber-500" />
        <div className="w-1/3 bg-red-600" />
      </div>
    </header>
  )
}
