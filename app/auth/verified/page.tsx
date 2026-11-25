import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export default async function EmailVerifiedPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user || !user.email_confirmed_at) redirect('/auth/verification-error')

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#2b2b2e] px-5 py-10 text-white">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-[#202023] p-8 text-center shadow-2xl sm:p-10">
        <img src="/zmindset-logo.png" alt="Zmindset" className="mx-auto size-14 rounded-2xl object-cover" />
        <CheckCircle2 aria-hidden="true" className="mx-auto mt-7 size-12 text-emerald-300" />
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Email berhasil diverifikasi</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/60">Akun Zmindset untuk <strong className="break-all text-white">{user.email}</strong> sudah aktif. Kamu sekarang dapat melanjutkan dan menyimpan progres habit.</p>
        <Link href="/" className="mt-7 inline-flex w-full items-center justify-center rounded-2xl bg-black px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-black/80">Lanjut ke Zmindset</Link>
      </section>
    </main>
  )
}
