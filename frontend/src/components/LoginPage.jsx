import React from 'react'
import { Icon, Button } from './ui'

export default function LoginPage({ form, setForm, onSubmit, error, busy, onBack }) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-margin md:px-margin-md py-space-xl">
      <div className="w-full max-w-md">
        <form
          onSubmit={onSubmit}
          className="bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-2xl shadow-lg overflow-hidden transition-colors"
        >
          {/* Tricolor brand bar */}
          <div className="h-1.5 w-full flex">
            <div className="w-1/3 bg-emerald-700" />
            <div className="w-1/3 bg-amber-500" />
            <div className="w-1/3 bg-red-600" />
          </div>
          <div className="p-space-xl flex flex-col gap-space-lg">
            <div className="flex flex-col items-center text-center gap-space-sm">
              <div className="h-16 w-24 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 flex items-center justify-center shadow-xs">
                <img src="/logo.jpg" alt="KCCA Logo" className="h-full w-full object-contain" />
              </div>
              <div>
                <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded">
                  Directorate of Engineering
                </span>
                <h1 className="font-headline-md text-headline-md text-slate-900 dark:text-white font-extrabold mt-1">
                  Operator Sign In
                </h1>
                <p className="font-body-md text-body-md text-slate-500 dark:text-slate-400 mt-0.5">
                  Access the KCCA ParkWatch monitoring &amp; telemetry console
                </p>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-space-xs bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg px-space-md py-space-sm font-body-sm text-body-sm"
              >
                <Icon name="error" size={18} className="text-red-600 dark:text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-col gap-space-lg">
              <div className="flex flex-col gap-space-xs">
                <label
                  htmlFor="username"
                  className="font-label-md text-label-md text-slate-700 dark:text-slate-300 uppercase tracking-wider font-semibold"
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="w-full h-12 px-space-md rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 font-body-md text-body-md focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-700 dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 focus:outline-none transition-all"
                  required
                />
              </div>

              <div className="flex flex-col gap-space-xs">
                <label
                  htmlFor="password"
                  className="font-label-md text-label-md text-slate-700 dark:text-slate-300 uppercase tracking-wider font-semibold"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full h-12 px-space-md rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 font-body-md text-body-md focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-700 dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 focus:outline-none transition-all"
                  required
                />
              </div>
            </div>

            <Button type="submit" disabled={busy} className="w-full h-12">
              {busy ? (
                <>
                  <Icon name="progress_activity" size={20} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  <Icon name="login" size={18} />
                  Sign In
                </>
              )}
            </Button>

            <button
              type="button"
              onClick={onBack}
              className="font-label-md text-label-md text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 hover:underline flex items-center justify-center gap-1 cursor-pointer transition-colors"
            >
              <Icon name="arrow_back" size={16} />
              Back to public availability
            </button>
          </div>
        </form>

        <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-space-md text-center mt-space-md">
          <p className="font-body-sm text-body-sm text-slate-600 dark:text-slate-300">
            Default Operator Credentials:
          </p>
          <p className="font-mono text-xs sm:text-sm font-bold text-emerald-800 dark:text-emerald-400 mt-1 flex flex-wrap items-center justify-center gap-1 sm:gap-2">
            <span>username: <span className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">operator</span></span>
            <span className="hidden sm:inline text-slate-400">|</span>
            <span>password: <span className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">operator123</span></span>
          </p>
        </div>
      </div>
    </div>
  )
}
