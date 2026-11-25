import Link from 'next/link'

export default function VerificationErrorPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#2b2b2e] px-5 py-10 text-white">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-[#202023] p-8 text-center shadow-2xl sm:p-10">
        <img src="/zmindset-logo.png" alt="Zmindset" className="mx-auto size-14 rounded-2xl object-cover" />
        <h1 className="mt-7 text-2xl font-semibold tracking-tight">Tautan tidak dapat digunakan</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/60">Tautan mungkin sudah kedaluwarsa atau pernah digunakan. Kembali ke Zmindset dan minta tautan verifikasi baru.</p>
        <Link href="/" className="mt-7 inline-flex w-full items-center justify-center rounded-2xl bg-black px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-black/80">Kembali ke Zmindset</Link>
      </section>
    </main>
  )
}
