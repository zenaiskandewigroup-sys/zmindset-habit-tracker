'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowUpRight, BarChart3, Check, ChevronDown, CircleHelp, Flame, LayoutGrid, LogOut, Plus, Settings, Sparkles, Target, Timer, TrendingUp } from 'lucide-react'
import { AuthDialog } from '@/components/auth-dialog'

type Habit = { id: string; name: string; detail: string; done: boolean }
type Workspace = { id: string; name: string; description: string; icon: typeof Target; habits: Habit[]; progress: number; change: string }

const chartData = [
  { day: 'Mon', value: 42 }, { day: 'Tue', value: 48 }, { day: 'Wed', value: 46 },
  { day: 'Thu', value: 56 }, { day: 'Fri', value: 63 }, { day: 'Sat', value: 67 }, { day: 'Sun', value: 74 },
]

const initialWorkspaces: Workspace[] = [
  { id: 'focus', name: 'Deep Focus', description: 'Protect your attention', icon: Target, progress: 74, change: '+12.4%', habits: [
    { id: '1', name: 'No phone before 9 AM', detail: 'Daily · 20 min saved', done: true },
    { id: '2', name: '90-minute focus block', detail: 'Daily · 1 session', done: true },
    { id: '3', name: 'Review tomorrow\'s priorities', detail: 'Daily · 5 min', done: false },
  ] },
  { id: 'health', name: 'Health & Energy', description: 'Build a stronger baseline', icon: Flame, progress: 61, change: '+8.1%', habits: [
    { id: '4', name: 'Morning movement', detail: 'Daily · 30 min', done: true },
    { id: '5', name: 'Drink 2L of water', detail: 'Daily · 8 glasses', done: false },
    { id: '6', name: 'Lights out by 11 PM', detail: 'Daily · 7h target', done: false },
  ] },
  { id: 'growth', name: 'Personal Growth', description: 'Small steps, bigger perspective', icon: Sparkles, progress: 82, change: '+18.6%', habits: [
    { id: '7', name: 'Read 10 pages', detail: 'Daily · 15 min', done: true },
    { id: '8', name: 'Write one reflection', detail: 'Daily · 5 min', done: true },
  ] },
]

export default function Page() {
  const [workspaces, setWorkspaces] = useState(initialWorkspaces)
  const [activeId, setActiveId] = useState('focus')
  const [showAll, setShowAll] = useState(false)
  const [toast, setToast] = useState('')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const active = workspaces.find((item) => item.id === activeId) ?? workspaces[0]

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUserEmail(session?.user?.email ?? null))
    return () => listener.subscription.unsubscribe()
  }, [])

  async function signOut() {
    await createClient().auth.signOut()
    setToast('Signed out')
  }
  const completed = active.habits.filter((habit) => habit.done).length
  const total = active.habits.length
  const overall = useMemo(() => Math.round(workspaces.reduce((sum, item) => sum + item.progress, 0) / workspaces.length), [workspaces])

  function toggleHabit(habitId: string) {
    setWorkspaces((current) => current.map((workspace) => workspace.id === activeId ? {
      ...workspace,
      habits: workspace.habits.map((habit) => habit.id === habitId ? { ...habit, done: !habit.done } : habit),
    } : workspace))
    setToast('Habit updated')
    window.setTimeout(() => setToast(''), 1800)
  }

  async function addWorkspace() {
    const name = window.prompt('Workspace name')?.trim()
    if (!name) return
    const id = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`
    const next = { id, name, description: 'A new space for consistent progress', icon: LayoutGrid, progress: 0, change: 'New', habits: [] }
    setWorkspaces((current) => [...current, next])
    setActiveId(id)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await supabase.from('workspaces').insert({ user_id: user.id, name, description: next.description, icon: 'layout-grid', color: 'slate' })
    } catch { /* preview remains usable while auth is not configured */ }
  }

  return (
    <main className="min-h-screen bg-[#f4f4f2] text-[#171719]">
      <div className="mx-auto flex min-h-screen max-w-[1500px] flex-col lg:flex-row">
        <aside className="flex w-full flex-col border-b border-black/8 bg-[#fafaf8] px-5 py-5 lg:w-[250px] lg:border-b-0 lg:border-r lg:px-6 lg:py-7">
          <div className="flex items-center gap-3">
            <img src="/zmindset-logo.png" alt="Zmindset" className="size-9 rounded-xl object-cover" />
            <div><p className="text-[15px] font-semibold tracking-tight">Zmindset</p><p className="text-[10px] uppercase tracking-[0.22em] text-black/40">Personal OS</p></div>
          </div>
          <nav className="mt-9 flex gap-2 overflow-x-auto lg:flex-col">
            <button className="flex items-center gap-3 rounded-xl bg-[#171719] px-3 py-2.5 text-left text-sm font-medium text-white"><LayoutGrid data-icon="inline-start" /> Overview</button>
            <button className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-black/50 hover:bg-black/5"><BarChart3 data-icon="inline-start" /> Insights</button>
            <button className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-black/50 hover:bg-black/5"><Settings data-icon="inline-start" /> Settings</button>
          </nav>
          <div className="mt-10 hidden lg:block"><p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-black/35">Workspaces</p><div className="flex flex-col gap-1">{workspaces.map((workspace) => { const Icon = workspace.icon; return <button key={workspace.id} onClick={() => setActiveId(workspace.id)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${activeId === workspace.id ? 'bg-black/6 font-medium' : 'text-black/50 hover:bg-black/5'}`}><Icon className="size-4" /><span className="truncate">{workspace.name}</span></button> })}</div><button onClick={addWorkspace} className="mt-3 flex items-center gap-2 px-3 text-xs text-black/45 hover:text-black"><Plus className="size-3.5" /> New workspace</button></div>
          <div className="mt-auto hidden items-center justify-between border-t border-black/8 pt-5 lg:flex"><div><p className="max-w-[145px] truncate text-xs font-medium">{userEmail ?? 'Guest mode'}</p><p className="text-[11px] text-black/40">{userEmail ? 'Synced workspace' : 'Sign in to sync'}</p></div>{userEmail ? <button aria-label="Sign out" onClick={signOut} className="text-black/35 hover:text-black"><LogOut className="size-4" /></button> : <button onClick={() => setAuthOpen(true)} className="rounded-lg bg-[#171719] px-2.5 py-1.5 text-[11px] font-medium text-white">Sign in</button>}</div>
        </aside>
        <section className="flex-1 px-5 py-7 sm:px-8 lg:px-12 lg:py-10">
          <header className="flex items-start justify-between gap-4"><div><p className="text-xs font-medium uppercase tracking-[0.22em] text-black/40">Tuesday, October 7</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Good morning, Alex<span className="text-black/25">.</span></h1><p className="mt-2 text-sm text-black/45">Keep the momentum. You&apos;re building something that lasts.</p></div><div className="flex items-center gap-2">{!userEmail && <button onClick={() => setAuthOpen(true)} className="rounded-xl bg-[#171719] px-3 py-2 text-xs font-medium text-white">Sign in</button>}<button className="hidden items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-medium shadow-sm sm:flex"><CircleHelp className="size-4 text-black/45" /> Help</button></div></header>
          <div className="mt-9 grid gap-4 sm:grid-cols-3"><Metric label="Today&apos;s progress" value={`${Math.round((completed / Math.max(total, 1)) * 100)}%`} detail={`${completed} of ${total} habits complete`} icon={Check} /><Metric label="Current streak" value="7 days" detail="Your personal best is 14" icon={Flame} /><Metric label="All workspaces" value={`${overall}%`} detail="+11.8% from last week" icon={TrendingUp} /></div>
          <div className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
            <div className="rounded-2xl border border-black/8 bg-white p-5 shadow-[0_10px_35px_rgba(0,0,0,0.03)] sm:p-7"><div className="flex items-start justify-between"><div><p className="text-xs font-medium uppercase tracking-[0.18em] text-black/40">Consistency trend</p><div className="mt-2 flex items-end gap-3"><span className="text-3xl font-semibold tracking-[-0.04em]">74%</span><span className="mb-1 flex items-center gap-1 text-xs font-medium text-black/55"><ArrowUpRight className="size-3.5" /> 12.4%</span></div></div><button className="flex items-center gap-1 rounded-lg bg-[#f4f4f2] px-2.5 py-1.5 text-xs text-black/55">This week <ChevronDown className="size-3.5" /></button></div><div className="mt-7 h-[190px] w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><defs><linearGradient id="consistency" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#171719" stopOpacity={0.15} /><stop offset="100%" stopColor="#171719" stopOpacity={0} /></linearGradient></defs><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#999' }} /><YAxis hide domain={[0, 100]} /><Tooltip cursor={{ stroke: '#ddd' }} contentStyle={{ borderRadius: 12, border: '1px solid #eee', fontSize: 12 }} /><Area type="monotone" dataKey="value" stroke="#171719" strokeWidth={2.5} fill="url(#consistency)" /></AreaChart></ResponsiveContainer></div></div>
            <div className="rounded-2xl bg-[#171719] p-6 text-white shadow-[0_10px_35px_rgba(0,0,0,0.08)]"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-[0.18em] text-white/45">Active workspace</p><h2 className="mt-2 text-xl font-semibold">{active.name}</h2></div><active.icon className="size-5 text-white/50" /></div><p className="mt-2 text-sm text-white/50">{active.description}</p><div className="mt-8 flex items-end justify-between"><span className="text-4xl font-semibold tracking-[-0.05em]">{active.progress}%</span><span className="text-xs text-white/45">{active.change} this week</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-white" style={{ width: `${active.progress}%` }} /></div><button onClick={() => setToast('Workspace details coming soon')} className="mt-7 flex items-center gap-2 text-xs font-medium text-white/70 hover:text-white">View workspace insights <ArrowUpRight className="size-3.5" /></button></div>
          </div>
          <div className="mt-8"><div className="flex items-end justify-between"><div><p className="text-xs font-medium uppercase tracking-[0.18em] text-black/40">Today&apos;s habits</p><h2 className="mt-2 text-xl font-semibold tracking-tight">{active.name}</h2></div><button onClick={addWorkspace} className="flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-medium shadow-sm hover:bg-black/[0.02]"><Plus className="size-3.5" /> Add habit</button></div><div className="mt-4 flex flex-col overflow-hidden rounded-2xl border border-black/8 bg-white">{(showAll ? active.habits : active.habits.slice(0, 3)).map((habit, index) => <button key={habit.id} onClick={() => toggleHabit(habit.id)} className="flex items-center gap-4 border-b border-black/6 px-5 py-4 text-left last:border-b-0 hover:bg-black/[0.015]"><span className={`flex size-6 shrink-0 items-center justify-center rounded-full border ${habit.done ? 'border-[#171719] bg-[#171719] text-white' : 'border-black/20 text-transparent'}`}><Check className="size-3.5" /></span><span className="min-w-0 flex-1"><span className={`block text-sm font-medium ${habit.done ? 'text-black/45 line-through' : ''}`}>{habit.name}</span><span className="mt-1 block text-xs text-black/38">{habit.detail}</span></span><span className="hidden items-center gap-1.5 text-[11px] text-black/35 sm:flex"><Timer className="size-3.5" /> {index + 1} of {total}</span></button>)}{active.habits.length > 3 && <button onClick={() => setShowAll(!showAll)} className="border-t border-black/6 px-5 py-3 text-xs font-medium text-black/45 hover:text-black">{showAll ? 'Show less' : `View all ${active.habits.length} habits`}</button>}</div></div>
        </section>
      </div>
      {toast && <div role="status" className="fixed bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-[#171719] px-4 py-2 text-xs font-medium text-white shadow-lg">{toast}</div>}
      {authOpen && <AuthDialog onClose={() => setAuthOpen(false)} />}
    </main>
  )
}

function Metric({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof Check }) { return <div className="rounded-2xl border border-black/8 bg-white p-5"><div className="flex items-center justify-between"><p className="text-xs text-black/45">{label}</p><Icon className="size-4 text-black/30" /></div><p className="mt-4 text-2xl font-semibold tracking-[-0.04em]">{value}</p><p className="mt-1 text-xs text-black/38">{detail}</p></div> }
