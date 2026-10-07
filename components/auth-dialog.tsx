'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Check, ChevronLeft, X } from 'lucide-react'

type AuthDialogProps = { onClose: () => void }

type Mode = 'chooser' | 'email'

export function AuthDialog({ onClose }: AuthDialogProps) {
  const [mode, setMode] = useState<Mode>('chooser')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [googleAccount, setGoogleAccount] = useState<string | null>(null)

  useEffect(() => {
    const remembered = window.sessionStorage.getItem('zmindset-google-account')
    setGoogleAccount(remembered)
  }, [])

  function resetError() { setError('') }

  async function google() {
    resetError()
    setBusy(true)
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (authError) {
      setBusy(false)
      setError('Google login is unavailable. Use email verification or try again later.')
    }
  }

  async function sendOtp() {
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setError('Enter a valid email address.')
      return
    }
    resetError()
    setBusy(true)
    const { error: authError } = await createClient().auth.signInWithOtp({
      email: normalizedEmail,
      options: { shouldCreateUser: true },
    })
    setBusy(false)
    if (authError) {
      setError('Unable to send a verification code. Please try again.')
      return
    }
    setEmail(normalizedEmail)
    setSent(true)
  }

  async function verifyOtp() {
    resetError()
    setBusy(true)
    const { error: authError } = await createClient().auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: otp.trim(),
      type: 'email',
    })
    setBusy(false)
    if (authError) {
      setError('That code is invalid or expired. Request a new one.')
      return
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <div className="relative w-full max-w-[430px] overflow-hidden rounded-[28px] border border-white/10 bg-[#202023] p-6 text-white shadow-2xl sm:p-8">
        <button onClick={onClose} aria-label="Close sign in" className="absolute right-5 top-5 rounded-full p-2 text-white/45 transition hover:bg-white/10 hover:text-white"><X className="size-4" /></button>
        <div className="mx-auto flex max-w-[330px] flex-col items-center text-center">
          <img src="/zmindset-logo.png" alt="Zmindset" className="size-14 rounded-2xl object-cover" />
          <h2 id="auth-title" className="mt-5 text-2xl font-semibold tracking-tight">Welcome to Zmindset</h2>
          <p className="mt-2 text-sm text-white/50">Sign in to keep every workspace synced.</p>

          {mode === 'chooser' && !sent && <div className="mt-8 w-full flex flex-col gap-3">
            {googleAccount && <button onClick={google} disabled={busy} className="flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3.5 text-left text-sm font-semibold text-[#1f1f22] transition hover:bg-white/90 disabled:opacity-50"><span className="grid size-8 place-items-center rounded-full bg-[#a45cc7] text-white">{googleAccount.slice(0, 1).toUpperCase()}</span><span className="flex-1"><span className="block">Continue with this account</span><span className="block text-xs font-normal text-black/50">{googleAccount}</span></span><span className="text-lg">G</span></button>}
            <button onClick={google} disabled={busy} className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/20 px-4 py-3.5 text-sm font-semibold transition hover:bg-white/10 disabled:opacity-50"><span className="font-bold text-lg">G</span> Continue with Google</button>
            <button onClick={() => { setMode('email'); resetError() }} className="rounded-2xl border border-white/20 px-4 py-3.5 text-sm font-semibold transition hover:bg-white/10">Continue with email</button>
          </div>}

          {mode === 'email' && !sent && <form onSubmit={(event) => { event.preventDefault(); void sendOtp() }} className="mt-8 w-full flex flex-col gap-3 text-left">
            <button type="button" onClick={() => setMode('chooser')} className="mb-2 flex items-center gap-2 text-xs text-white/50 hover:text-white"><ChevronLeft className="size-4" /> Other sign-in options</button>
            <label className="text-xs font-medium text-white/65" htmlFor="auth-email">Email address</label>
            <input id="auth-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/45" />
            <button type="submit" disabled={busy || !email.includes('@')} className="rounded-2xl bg-[#09090a] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-40">{busy ? 'Sending code…' : 'Send verification code'}</button>
          </form>}

          {sent && <div className="mt-8 w-full flex flex-col gap-3 text-left">
            <p className="text-sm text-white/60">We sent a 6-digit code to <strong className="text-white">{email}</strong>.</p>
            <label className="text-xs font-medium text-white/65" htmlFor="auth-otp">Verification code</label>
            <input id="auth-otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))} placeholder="000000" className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3.5 text-center text-xl tracking-[0.4em] text-white outline-none placeholder:text-white/25 focus:border-white/45" />
            <button onClick={verifyOtp} disabled={busy || otp.length !== 6} className="rounded-2xl bg-[#09090a] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-40">{busy ? 'Verifying…' : 'Verify and continue'}</button>
            <button onClick={() => { setSent(false); setOtp('') }} className="text-xs text-white/45 hover:text-white">Use a different email</button>
          </div>}

          {error && <p role="alert" className="mt-4 text-xs text-red-300">{error}</p>}
          <p className="mt-7 flex gap-2 text-left text-[11px] leading-relaxed text-white/35"><Check className="mt-0.5 size-3.5 shrink-0" />Your data stays private and is protected by Supabase Row Level Security.</p>
        </div>
      </div>
    </div>
  )
}
