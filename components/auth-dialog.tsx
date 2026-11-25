'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Check, X } from 'lucide-react'

type AuthDialogProps = { onClose: () => void }
type Mode = 'signup' | 'signin'

function authCallbackUrl() {
  const base = process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback`
  const url = new URL(base)
  url.searchParams.set('next', '/auth/verified')
  return url.toString()
}

export function AuthDialog({ onClose }: AuthDialogProps) {
  const [mode, setMode] = useState<Mode>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmationSent, setConfirmationSent] = useState(false)
  const [resendNotice, setResendNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submitCredentials(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
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
    try {
      const supabase = createClient()
      const result = mode === 'signup'
        ? await supabase.auth.signUp({
            email: normalizedEmail,
            password,
            options: { emailRedirectTo: authCallbackUrl() },
          })
        : await supabase.auth.signInWithPassword({ email: normalizedEmail, password })

      if (result.error) {
        const message = result.error.message.toLowerCase()
        if (message.includes('password') && (message.includes('weak') || message.includes('at least'))) {
          setError('Password terlalu lemah. Gunakan password yang lebih kuat.')
        } else if (message.includes('invalid login credentials')) {
          setError('Email atau password tidak cocok.')
        } else if (message.includes('not confirmed') || message.includes('email_not_confirmed')) {
          setError('Email belum diverifikasi. Buka tautan verifikasi terbaru yang kami kirim ke emailmu.')
        } else if (message.includes('rate limit') || message.includes('too many')) {
          setError('Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.')
        } else {
          setError(mode === 'signup' ? 'Akun belum bisa dibuat. Periksa email dan coba lagi.' : 'Login belum berhasil. Periksa email dan password.')
        }
        return
      }

      if (mode === 'signup' && result.data.session) {
        await supabase.auth.signOut()
        setError('Konfirmasi email belum aktif untuk proyek Auth. Akun belum bisa digunakan sampai email confirmation diaktifkan.')
        return
      }
      if (mode === 'signup') {
        setEmail(normalizedEmail)
        setConfirmationSent(true)
        return
      }
      onClose()
    } catch {
      setError('Koneksi sedang bermasalah. Periksa internet lalu coba lagi.')
    } finally {
      setBusy(false)
    }
  }

  async function resendConfirmation() {
    setError('')
    setResendNotice('')
    setBusy(true)
    try {
      const { error: resendError } = await createClient().auth.resend({
        type: 'signup',
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: authCallbackUrl() },
      })
      if (resendError) setError('Tautan belum bisa dikirim ulang. Tunggu sebentar lalu coba lagi.')
      else setResendNotice('Jika alamat tersebut dapat didaftarkan, tautan verifikasi terbaru sudah dikirim.')
    } catch {
      setError('Koneksi sedang bermasalah. Coba kirim ulang nanti.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <div className="relative w-full max-w-[430px] overflow-hidden rounded-[28px] border border-white/10 bg-[#202023] p-6 text-white shadow-2xl sm:p-8">
        <button onClick={onClose} aria-label="Tutup" className="absolute right-5 top-5 rounded-full p-2 text-white/45 transition hover:bg-white/10 hover:text-white"><X className="size-4" /></button>
        <div className="mx-auto flex max-w-[330px] flex-col items-center text-center">
          <img src="/zmindset-logo.png" alt="Zmindset" className="size-14 rounded-2xl object-cover" />

          {confirmationSent ? <>
            <h2 id="auth-title" className="mt-5 text-2xl font-semibold tracking-tight">Periksa email kamu</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/60">Jika alamat email dapat didaftarkan, tautan verifikasi sudah dikirim ke <strong className="break-all text-white">{email}</strong>. Buka email terbaru dan tekan tombol konfirmasi untuk mengaktifkan akun.</p>
            <button onClick={() => void resendConfirmation()} disabled={busy} className="mt-6 w-full rounded-2xl border border-white/20 px-4 py-3.5 text-sm font-semibold transition hover:bg-white/10 disabled:opacity-50">{busy ? 'Mengirim…' : 'Kirim ulang tautan'}</button>
            {resendNotice && <p role="status" className="mt-4 text-xs leading-relaxed text-emerald-200">{resendNotice}</p>}
            <button onClick={() => { setConfirmationSent(false); setMode('signin'); setPassword(''); setError(''); setResendNotice('') }} className="mt-4 text-xs text-white/50 underline underline-offset-4 hover:text-white">Kembali ke login</button>
          </> : <>
            <h2 id="auth-title" className="mt-5 text-2xl font-semibold tracking-tight">{mode === 'signup' ? 'Buat akun Zmindset' : 'Masuk ke Zmindset'}</h2>
            <p className="mt-2 text-sm text-white/50">{mode === 'signup' ? 'Verifikasi email untuk mengaktifkan akun dan menyimpan progresmu.' : 'Masuk untuk melanjutkan workspace dan habit kamu.'}</p>
            <form onSubmit={(event) => void submitCredentials(event)} className="mt-7 flex w-full flex-col gap-3 text-left">
              <label className="text-xs font-medium text-white/65" htmlFor="auth-email">Email</label>
              <input id="auth-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@email.com" className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/45" />
              <label className="mt-1 text-xs font-medium text-white/65" htmlFor="auth-password">Password</label>
              <input id="auth-password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required minLength={mode === 'signup' ? 8 : undefined} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === 'signup' ? 'Minimal 8 karakter' : 'Password kamu'} className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/45" />
              <button type="submit" disabled={busy} className="mt-2 rounded-2xl bg-[#09090a] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-50">{busy ? 'Memproses…' : mode === 'signup' ? 'Buat akun' : 'Masuk'}</button>
            </form>
            <p className="mt-5 text-xs text-white/50">{mode === 'signup' ? 'Sudah punya akun?' : 'Belum punya akun?'}{' '}
              <button onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError('') }} className="font-semibold text-white underline underline-offset-4 hover:text-white/75">{mode === 'signup' ? 'Masuk' : 'Buat akun'}</button>
            </p>
            {error && <p role="alert" className="mt-4 text-xs text-red-300">{error}</p>}
            <p className="mt-7 flex gap-2 text-left text-[11px] leading-relaxed text-white/35"><Check className="mt-0.5 size-3.5 shrink-0" />Kami hanya mengaktifkan akun setelah tautan verifikasi dibuka. Data dilindungi Supabase Auth dan RLS.</p>
          </>}
          {confirmationSent && error && <p role="alert" className="mt-4 text-xs text-red-300">{error}</p>}
        </div>
      </div>
    </div>
  )
}
