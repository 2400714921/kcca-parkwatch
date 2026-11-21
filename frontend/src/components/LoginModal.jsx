import React, { useState, useEffect, useRef } from 'react'
import { Icon, Button } from './ui'

export default function LoginModal({
  isOpen,
  onClose,
  initialMode = 'signin',
  form,
  setForm,
  onSubmit,
  onSignup,
  error,
  busy,
}) {
  const [mode, setMode] = useState(initialMode || 'signin')
  const [showSignInPassword, setShowSignInPassword] = useState(false)
  const [showSignUpPassword, setShowSignUpPassword] = useState(false)
  const [showSignUpConfirmPassword, setShowSignUpConfirmPassword] = useState(false)
  const modalRef = useRef(null)
  const usernameInputRef = useRef(null)

  // Local signup form state
  const [signupForm, setSignupForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    email: '',
    phone: '',
  })
  const [localError, setLocalError] = useState('')

  // Sync mode when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode || 'signin')
      setLocalError('')
      setShowSignInPassword(false)
      setShowSignUpPassword(false)
      setShowSignUpConfirmPassword(false)
      setTimeout(() => {
        usernameInputRef.current?.focus()
      }, 100)
    }
  }, [isOpen, initialMode])

  // Close on Escape key press
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleSignupSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')

    if (!signupForm.username.trim() || !signupForm.password.trim()) {
      setLocalError('Username and password are required.')
      return
    }
    if (!signupForm.email.trim() || !signupForm.email.includes('@')) {
      setLocalError('A valid email address is required.')
      return
    }
    if (signupForm.password.length < 6) {
      setLocalError('Password must be at least 6 characters.')
      return
    }
    if (signupForm.password !== signupForm.confirmPassword) {
      setLocalError('Passwords do not match. Please re-enter.')
      return
    }

    if (onSignup) {
      try {
        const payload = {
          username: signupForm.username.trim(),
          password: signupForm.password,
          displayName: signupForm.displayName.trim(),
          email: signupForm.email.trim(),
          phone: signupForm.phone.trim(),
        }
        await onSignup(payload)
      } catch (err) {
        setLocalError(err.message || 'Signup failed')
      }
    }
  }

  const activeError = localError || error

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-lg bg-white dark:bg-[#151f30] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden relative transition-all transform scale-100 max-h-[95vh] flex flex-col"
      >
        {/* Tricolor Uganda/KCCA brand accent strip */}
        <div className="h-1 w-full flex shrink-0">
          <div className="w-1/3 bg-emerald-600" />
          <div className="w-1/3 bg-amber-400" />
          <div className="w-1/3 bg-red-600" />
        </div>

        {/* Close Button (X) */}
        <button
          type="button"
          onClick={onClose}
          data-testid="auth-modal-close-btn"
          aria-label="Close modal"
          title="Close modal (Esc)"
          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-slate-100 hover:bg-red-500 hover:text-white dark:bg-slate-800 dark:hover:bg-red-500 text-slate-500 dark:text-slate-300 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer z-10 shadow-xs"
        >
          <Icon name="close" size={18} />
        </button>

        <div className="p-4 sm:p-5 flex flex-col gap-3 overflow-y-auto">
          {/* Header & Logo */}
          <div className="flex items-center gap-3 pr-8">
            <div className="h-10 w-12 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 flex items-center justify-center shadow-xs shrink-0">
              <img src="/logo.jpg" alt="KCCA Logo" className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2
                  id="auth-modal-title"
                  className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight"
                >
                  {mode === 'signup' ? 'Create Free Account' : 'Sign In to ParkWatch'}
                </h2>
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 px-2 py-0.2 rounded-full hidden sm:inline">
                  Civic Access
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {mode === 'signup'
                  ? 'Join free to unlock live bay counts, rates, and GIS map'
                  : 'Access real-time parking spots and telemetry console'}
              </p>
            </div>
          </div>

          {/* Mode Switch Tabs */}
          <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5">
            <button
              type="button"
              onClick={() => {
                setMode('signin')
                setLocalError('')
              }}
              data-testid="tab-signin"
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                mode === 'signin'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup')
                setLocalError('')
              }}
              data-testid="tab-signup"
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Error Banner */}
          {activeError && (
            <div
              role="alert"
              className="flex items-start gap-2 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg p-2.5 text-xs font-medium"
            >
              <Icon name="error" size={16} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <span>{activeError}</span>
            </div>
          )}

          {/* =========================================================================
              SIGN IN FORM
              ========================================================================= */}
          {mode === 'signin' ? (
            <form onSubmit={onSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="modal-email"
                  className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5"
                >
                  <Icon name="mail" size={13} className="text-amber-500" />
                  <span>Email Address</span>
                </label>
                <input
                  ref={usernameInputRef}
                  id="modal-email"
                  data-testid="modal-email-input"
                  type="email"
                  autoComplete="email"
                  value={form.email ?? form.username ?? ''}
                  onChange={(e) => setForm({ ...form, email: e.target.value, username: e.target.value })}
                  placeholder="e.g. motorist@parkwatch.ug or admin@kcca.go.ug"
                  className="w-full h-9.5 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:bg-white dark:focus:bg-slate-800 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20 focus:outline-none transition-all"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="modal-password"
                  className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="modal-password"
                    type={showSignInPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full h-9.5 pl-3 pr-10 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:bg-white dark:focus:bg-slate-800 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20 focus:outline-none transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignInPassword((v) => !v)}
                    data-testid="toggle-signin-password"
                    aria-label={showSignInPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md transition-colors cursor-pointer"
                  >
                    <Icon name={showSignInPassword ? 'visibility_off' : 'visibility'} size={16} />
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={busy}
                data-testid="login-submit-btn"
                className="w-full h-9.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-lg shadow-sm border-0 transition-all flex items-center justify-center gap-2 cursor-pointer mt-0.5"
              >
                {busy ? (
                  <>
                    <Icon name="progress_activity" size={16} className="animate-spin" />
                    <span>Signing in…</span>
                  </>
                ) : (
                  <>
                    <Icon name="login" size={16} />
                    <span>Sign In to Unlock Spots</span>
                  </>
                )}
              </Button>

              {/* Secondary Dismiss Button */}
              <button
                type="button"
                onClick={onClose}
                data-testid="auth-modal-cancel-btn"
                className="w-full py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>✕ Dismiss &amp; Browse as Guest</span>
              </button>

              <div className="text-center pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup')
                    setLocalError('')
                  }}
                  className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  New to ParkWatch? Create a free account →
                </button>
              </div>
            </form>
          ) : (
            /* =========================================================================
                SIGN UP FORM
                ========================================================================= */
            <form onSubmit={handleSignupSubmit} className="flex flex-col gap-2.5">
              {/* Row 1: Display Name & Username */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-0.5">
                  <label
                    htmlFor="modal-displayname"
                    className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
                  >
                    Full Name / Display Name
                  </label>
                  <input
                    id="modal-displayname"
                    type="text"
                    value={signupForm.displayName}
                    onChange={(e) => setSignupForm({ ...signupForm, displayName: e.target.value })}
                    placeholder="e.g. Samuel Mugisha"
                    className="w-full h-9 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-0.5">
                  <label
                    htmlFor="modal-signup-username"
                    className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
                  >
                    Username *
                  </label>
                  <input
                    ref={usernameInputRef}
                    id="modal-signup-username"
                    type="text"
                    required
                    value={signupForm.username}
                    onChange={(e) => setSignupForm({ ...signupForm, username: e.target.value })}
                    placeholder="e.g. samuel_m"
                    className="w-full h-9 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 2: Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-0.5">
                  <label
                    htmlFor="modal-signup-email"
                    className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
                  >
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="modal-signup-email"
                    type="email"
                    required
                    value={signupForm.email}
                    onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                    placeholder="name@gmail.com"
                    className="w-full h-9 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-0.5">
                  <label
                    htmlFor="modal-signup-phone"
                    className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
                  >
                    Phone (Optional)
                  </label>
                  <input
                    id="modal-signup-phone"
                    type="tel"
                    value={signupForm.phone}
                    onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })}
                    placeholder="+256 700 000000"
                    className="w-full h-9 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 3: Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-0.5">
                  <label
                    htmlFor="modal-signup-password"
                    className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
                  >
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      id="modal-signup-password"
                      type={showSignUpPassword ? 'text' : 'password'}
                      required
                      value={signupForm.password}
                      onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                      placeholder="Min. 6 chars"
                      className="w-full h-9 pl-3 pr-8 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs focus:border-amber-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignUpPassword((v) => !v)}
                      data-testid="toggle-signup-password"
                      aria-label={showSignUpPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md transition-colors cursor-pointer"
                    >
                      <Icon name={showSignUpPassword ? 'visibility_off' : 'visibility'} size={15} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-0.5">
                  <label
                    htmlFor="modal-signup-confirmpassword"
                    className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
                  >
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <input
                      id="modal-signup-confirmpassword"
                      type={showSignUpConfirmPassword ? 'text' : 'password'}
                      required
                      value={signupForm.confirmPassword}
                      onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                      placeholder="Re-enter password"
                      className="w-full h-9 pl-3 pr-8 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs focus:border-amber-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignUpConfirmPassword((v) => !v)}
                      data-testid="toggle-signup-confirm-password"
                      aria-label={showSignUpConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md transition-colors cursor-pointer"
                    >
                      <Icon name={showSignUpConfirmPassword ? 'visibility_off' : 'visibility'} size={15} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={busy}
                data-testid="signup-submit-btn"
                className="w-full h-9.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-lg shadow-sm border-0 transition-all flex items-center justify-center gap-2 cursor-pointer mt-0.5"
              >
                {busy ? (
                  <>
                    <Icon name="progress_activity" size={16} className="animate-spin" />
                    <span>Creating Account…</span>
                  </>
                ) : (
                  <>
                    <Icon name="person_add" size={16} />
                    <span>Create Account &amp; Unlock Spots</span>
                  </>
                )}
              </Button>

              {/* Secondary Dismiss Button */}
              <button
                type="button"
                onClick={onClose}
                data-testid="auth-modal-cancel-btn"
                className="w-full py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>✕ Dismiss &amp; Browse as Guest</span>
              </button>

              <div className="text-center pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin')
                    setLocalError('')
                  }}
                  className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  Already have an account? Sign in →
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
