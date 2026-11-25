'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Check, X } from 'lucide-react'

type AuthDialogProps = { onClose: () => void }
type Mode = 'signup' | 'signin'

export function AuthDialog({ onClose }: AuthDialogProps) {
  const [mode, setMode] = useState<Mode>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  function resetMessages() {
    setError('')
    setNotice('')
  }

  async function continueWithGoogle() {
    resetMessages()
    setBusy(true)
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback`,
      },
    })
    if (authError) {
      setBusy(false)
      const message = authError.message.toLowerCase()
      setError(message.includes('provider is not enabled') || message.includes('unsupported provider')
        ? 'Google Auth belum diaktifkan di pengaturan Supabase.'
        : 'Tidak bisa memulai Google Auth. Coba lagi atau periksa konfigurasi provider.')
    }
  }

  async function submitCredentials(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    resetMessages()
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail || !password) {
      setError('Masukkan email dan password.')
      return
    }
    if (mode === 'signup' && password.length < 8) {
      setError('Password harus berisi minimal 8 karakter.')
      return
    }

    setBusy(true)
    const supabase = createClient()
    const result = mode === 'signup'
      ? await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback`,
          },
        })
      : await supabase.auth.signInWithPassword({ email: normalizedEmail, password })
    setBusy(false)

    if (result.error) {
      const message = result.error.message.toLowerCase()
      if (message.includes('password') && (message.includes('weak') || message.includes('at least'))) {
        setError('Password terlalu lemah. Gunakan password yang lebih kuat.')
      } else if (message.includes('invalid login credentials')) {
        setError('Email atau password tidak cocok.')
      } else if (message.includes('rate limit') || message.includes('too many')) {
        setError('Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.')
      } else {
        setError(mode === 'signup' ? 'Akun belum bisa dibuat. Periksa email dan pengaturan Auth, lalu coba lagi.' : 'Login belum berhasil. Periksa email dan password.')
      }
      return
    }

    if (mode === 'signup' && !result.data.session) {
      setNotice('Akun tercatat, tetapi Supabase masih meminta konfirmasi email. Untuk langsung masuk tanpa email, matikan Confirm email di Supabase Auth settings.')
      return
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <div className="relative w-full max-w-[430px] overflow-hidden rounded-[28px] border border-white/10 bg-[#202023] p-6 text-white shadow-2xl sm:p-8">
        <button onClick={onClose} aria-label="Tutup" className="absolute right-5 top-5 rounded-full p-2 text-white/45 transition hover:bg-white/10 hover:text-white"><X className="size-4" /></button>
        <div className="mx-auto flex max-w-[330px] flex-col items-center text-center">
          <img src="/zmindset-logo.png" alt="Zmindset" className="size-14 rounded-2xl object-cover" />
          <h2 id="auth-title" className="mt-5 text-2xl font-semibold tracking-tight">{mode === 'signup' ? 'Buat akun Zmindset' : 'Masuk ke Zmindset'}</h2>
          <p className="mt-2 text-sm text-white/50">Simpan dan sinkronkan workspace serta habit kamu.</p>

          <button onClick={() => void continueWithGoogle()} disabled={busy} className="mt-7 flex w-full items-center justify-center gap-3 rounded-2xl border border-white/20 px-4 py-3.5 text-sm font-semibold transition hover:bg-white/10 disabled:opacity-50">
            <span aria-hidden="true" className="text-lg font-bold">G</span> Masuk dengan Google
          </button>

          <div className="my-5 flex w-full items-center gap-3 text-[11px] text-white/35"><span className="h-px flex-1 bg-white/10" />ATAU DENGAN EMAIL<span className="h-px flex-1 bg-white/10" /></div>

          <form onSubmit={(event) => void submitCredentials(event)} className="flex w-full flex-col gap-3 text-left">
            <label className="text-xs font-medium text-white/65" htmlFor="auth-email">Email</label>
            <input id="auth-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@email.com" className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/45" />
            <label className="mt-1 text-xs font-medium text-white/65" htmlFor="auth-password">Password</label>
            <input id="auth-password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required minLength={mode === 'signup' ? 8 : undefined} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === 'signup' ? 'Minimal 8 karakter' : 'Password kamu'} className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/45" />
            <button type="submit" disabled={busy} className="mt-2 rounded-2xl bg-[#09090a] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-50">{busy ? 'Memproses…' : mode === 'signup' ? 'Buat akun' : 'Masuk'}</button>
          </form>

          <p className="mt-5 text-xs text-white/50">{mode === 'signup' ? 'Sudah punya akun?' : 'Belum punya akun?'}{' '}
            <button onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); resetMessages() }} className="font-semibold text-white underline underline-offset-4 hover:text-white/75">{mode === 'signup' ? 'Masuk' : 'Buat akun'}</button>
          </p>
          {error && <p role="alert" className="mt-4 text-xs text-red-300">{error}</p>}
          {notice && <p role="status" className="mt-4 text-xs leading-relaxed text-amber-200">{notice}</p>}
          <p className="mt-7 flex gap-2 text-left text-[11px] leading-relaxed text-white/35"><Check className="mt-0.5 size-3.5 shrink-0" />Data akun disimpan dan dilindungi oleh Supabase. Gunakan password unik yang tidak dipakai di layanan lain.</p>
        </div>
      </div>
    </div>
  )
}
