'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Check, X } from 'lucide-react'

export function AuthDialog({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function sendOtp() {
    setError(''); setBusy(true)
    const { error } = await createClient().auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } })
    setBusy(false)
    if (error) return setError('Unable to send the code. Check your email and try again.')
    setSent(true)
  }

  async function verifyOtp() {
    setError(''); setBusy(true)
    const { error } = await createClient().auth.verifyOtp({ email: email.trim(), token: otp.trim(), type: 'email' })
    setBusy(false)
    if (error) return setError('That code is invalid or expired. Request a new one.')
    onClose()
  }

  async function google() {
    setError(''); setBusy(true)
    const { error } = await createClient().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } })
    if (error) { setBusy(false); setError('Google sign-in is not available right now.') }
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="auth-title">
    <div className="relative w-full max-w-[390px] rounded-3xl bg-white p-7 shadow-2xl">
      <button onClick={onClose} aria-label="Close sign in" className="absolute right-5 top-5 rounded-full p-1 text-black/35 hover:bg-black/5 hover:text-black"><X className="size-4" /></button>
      <img src="/zmindset-logo.png" alt="Zmindset" className="size-11 rounded-2xl object-cover" />
      <h2 id="auth-title" className="mt-5 text-2xl font-semibold tracking-tight">Welcome back</h2>
      <p className="mt-2 text-sm text-black/45">Sign in to keep every workspace synced.</p>
      <button onClick={google} disabled={busy} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-black/10 px-4 py-3 text-sm font-medium hover:bg-black/[0.02] disabled:opacity-50"><span className="font-bold">G</span> Continue with Google</button>
      <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-black/30"><span className="h-px flex-1 bg-black/10" />or email<span className="h-px flex-1 bg-black/10" /></div>
      {!sent ? <div className="flex flex-col gap-3"><label className="text-xs font-medium text-black/60" htmlFor="auth-email">Email address</label><input id="auth-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-black/35" /><button onClick={sendOtp} disabled={busy || !email.includes('@')} className="rounded-xl bg-[#171719] px-4 py-3 text-sm font-medium text-white disabled:opacity-40">Send verification code</button></div> : <div className="flex flex-col gap-3"><p className="text-sm text-black/55">We sent a 6-digit code to <strong className="text-black">{email}</strong>.</p><label className="text-xs font-medium text-black/60" htmlFor="auth-otp">Verification code</label><input id="auth-otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))} placeholder="000000" className="rounded-xl border border-black/10 px-4 py-3 text-center text-lg tracking-[0.35em] outline-none focus:border-black/35" /><button onClick={verifyOtp} disabled={busy || otp.length !== 6} className="rounded-xl bg-[#171719] px-4 py-3 text-sm font-medium text-white disabled:opacity-40">Verify and continue</button><button onClick={() => setSent(false)} className="text-xs text-black/45 hover:text-black">Use a different email</button></div>}
      {error && <p role="alert" className="mt-4 text-xs text-red-600">{error}</p>}
      <p className="mt-6 flex gap-2 text-[11px] leading-relaxed text-black/35"><Check className="mt-0.5 size-3.5 shrink-0" />Your data stays private and is protected by Supabase Row Level Security.</p>
    </div>
  </div>
}
