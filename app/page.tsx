'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BarChart3, Check, ChevronDown, CircleHelp, Flame, LayoutGrid, LogOut, Plus, Settings, Sparkles, Target, Timer, TrendingUp, X } from 'lucide-react'
import { AuthDialog } from '@/components/auth-dialog'

type HabitRow = { id: string; name: string; frequency: string; target_per_week: number; workspace_id: string }
type WorkspaceRow = { id: string; name: string; description: string; icon: string; color: string }
type LogRow = { habit_id: string; completed_on: string }
type Workspace = WorkspaceRow & { habits: HabitRow[]; logs: LogRow[] }

const iconMap = { target: Target, flame: Flame, sparkles: Sparkles, 'layout-grid': LayoutGrid }
const today = new Date().toISOString().slice(0, 10)

export default function Page() {
  const getSupabase = () => createClient()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [view, setView] = useState<'overview' | 'insights' | 'settings'>('overview')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      const { data: { user } } = await getSupabase().auth.getUser()
      if (!mounted) return
      setUserEmail(user?.email ?? null)
      if (!user) { setWorkspaces([]); setLoading(false); return }
      const [{ data: ws }, { data: habits }, { data: logs }] = await Promise.all([
        getSupabase().from('workspaces').select('id,name,description,icon,color').order('created_at', { ascending: true }),
        getSupabase().from('habits').select('id,name,frequency,target_per_week,workspace_id').order('sort_order', { ascending: true }),
        getSupabase().from('habit_logs').select('habit_id,completed_on').gte('completed_on', new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10)),
      ])
      const workspaceRows = (ws ?? []) as WorkspaceRow[]
      const habitRows = (habits ?? []) as HabitRow[]
      const logRows = (logs ?? []) as LogRow[]
      const next: Workspace[] = workspaceRows.map((workspace: WorkspaceRow) => ({ ...workspace, habits: habitRows.filter((habit: HabitRow) => habit.workspace_id === workspace.id), logs: logRows.filter((log: LogRow) => habitRows.some((habit: HabitRow) => habit.id === log.habit_id && habit.workspace_id === workspace.id)) }))
      setWorkspaces(next)
      setActiveId((current) => current && next.some((item: Workspace) => item.id === current) ? current : next[0]?.id ?? null)
      setLoading(false)
    }
    void load()
    const { data: listener } = getSupabase().auth.onAuthStateChange(() => void load())
    return () => { mounted = false; listener.subscription.unsubscribe() }
  }, [])

  const active = workspaces.find((item) => item.id === activeId) ?? null
  const completed = active?.habits.filter((habit) => active.logs.some((log) => log.habit_id === habit.id && log.completed_on === today)).length ?? 0
  const total = active?.habits.length ?? 0
  const overall = workspaces.length ? Math.round(workspaces.reduce((sum, item) => sum + completion(item), 0) / workspaces.length) : 0
  const chartData = active ? Array.from({ length: 7 }, (_, index) => { const date = new Date(Date.now() - (6 - index) * 86400000).toISOString().slice(0, 10); return { day: new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' }), value: active.habits.length ? Math.round(active.habits.filter((habit) => active.logs.some((log) => log.habit_id === habit.id && log.completed_on === date)).length / active.habits.length * 100) : 0 } }) : []

  function notify(message: string) { setToast(message); window.setTimeout(() => setToast(''), 1800) }
  async function toggleHabit(habit: HabitRow) {
    if (!userEmail || !active) return setAuthOpen(true)
    const existing = active.logs.find((log) => log.habit_id === habit.id && log.completed_on === today)
    const result = existing ? await getSupabase().from('habit_logs').delete().eq('id', (await getSupabase().from('habit_logs').select('id').eq('habit_id', habit.id).eq('completed_on', today).single()).data?.id) : await getSupabase().from('habit_logs').insert({ habit_id: habit.id, workspace_id: active.id, user_id: (await getSupabase().auth.getUser()).data.user?.id, completed_on: today })
    if (result.error) return notify('Unable to update habit')
    setWorkspaces((items) => items.map((item) => item.id === active.id ? { ...item, logs: existing ? item.logs.filter((log) => !(log.habit_id === habit.id && log.completed_on === today)) : [...item.logs, { habit_id: habit.id, completed_on: today }] } : item))
    notify(existing ? 'Habit unchecked' : 'Habit completed')
  }
  async function addWorkspace() {
    if (!userEmail) return setAuthOpen(true)
    const name = window.prompt('Workspace name')?.trim(); if (!name) return
    const user = (await getSupabase().auth.getUser()).data.user; if (!user) return
    const { data, error } = await getSupabase().from('workspaces').insert({ user_id: user.id, name, description: 'Your next consistent system', icon: 'layout-grid', color: 'slate' }).select('id,name,description,icon,color').single()
    if (error || !data) return notify('Unable to create workspace')
    setWorkspaces((items) => [...items, { ...data, habits: [], logs: [] }]); setActiveId(data.id); notify('Workspace created')
  }
  async function addHabit() {
    if (!userEmail || !active) return setAuthOpen(true)
    const name = window.prompt('Habit name')?.trim(); if (!name) return
    const user = (await getSupabase().auth.getUser()).data.user; if (!user) return
    const { data, error } = await getSupabase().from('habits').insert({ user_id: user.id, workspace_id: active.id, name, frequency: 'daily', target_per_week: 7, sort_order: active.habits.length }).select('id,name,frequency,target_per_week,workspace_id').single()
    if (error || !data) return notify('Unable to create habit')
    setWorkspaces((items) => items.map((item) => item.id === active.id ? { ...item, habits: [...item.habits, data] } : item)); notify('Habit added')
  }
  async function signOut() { await getSupabase().auth.signOut(); notify('Signed out') }

  return <main className="min-h-screen bg-[#2b2b2e] text-white"><div className="mx-auto flex min-h-screen max-w-[1500px] flex-col lg:flex-row">
    <aside className="flex w-full flex-col border-b border-white/10 bg-[#242426] px-5 py-5 lg:w-[250px] lg:border-b-0 lg:border-r lg:px-6 lg:py-7"><div className="flex items-center gap-3"><img src="/zmindset-logo.png" alt="Zmindset" className="size-9 rounded-xl object-cover" /><div><p className="text-[15px] font-semibold">Zmindset</p><p className="text-[10px] uppercase tracking-[0.22em] text-white/45">Personal OS</p></div></div><nav className="mt-9 flex gap-2 overflow-x-auto lg:flex-col"><NavButton active={view === 'overview'} onClick={() => setView('overview')} icon={LayoutGrid}>Overview</NavButton><NavButton active={view === 'insights'} onClick={() => setView('insights')} icon={BarChart3}>Insights</NavButton><NavButton active={view === 'settings'} onClick={() => setView('settings')} icon={Settings}>Settings</NavButton></nav><div className="mt-10 hidden lg:block"><p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Workspaces</p><div className="flex flex-col gap-1">{workspaces.map((workspace) => <button key={workspace.id} onClick={() => { setActiveId(workspace.id); setView('overview') }} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${activeId === workspace.id ? 'bg-white/15 font-medium' : 'text-white/60 hover:bg-white/10'}`}><IconFor name={workspace.icon} /><span className="truncate">{workspace.name}</span></button>)}</div><button onClick={addWorkspace} className="mt-3 flex items-center gap-2 px-3 text-xs text-white/55 hover:text-white"><Plus className="size-3.5" /> New workspace</button></div><div className="mt-auto hidden items-center justify-between border-t border-white/10 pt-5 lg:flex"><div><p className="max-w-[145px] truncate text-xs font-medium">{userEmail ?? 'Not signed in'}</p><p className="text-[11px] text-white/45">{userEmail ? 'Live sync active' : 'Sign in to start'}</p></div>{userEmail ? <button aria-label="Sign out" onClick={signOut} className="text-white/55 hover:text-white"><LogOut className="size-4" /></button> : <button onClick={() => setAuthOpen(true)} className="rounded-lg bg-[#171719] px-2.5 py-1.5 text-[11px] font-medium text-white">Sign in</button>}</div></aside>
    <section className="flex-1 px-5 py-7 sm:px-8 lg:px-12 lg:py-10">{view === 'settings' ? <SettingsView email={userEmail} onSignOut={signOut} /> : view === 'insights' ? <InsightsView workspaces={workspaces} /> : <><header className="flex items-start justify-between gap-4"><div><p className="text-xs font-medium uppercase tracking-[0.22em] text-white/55">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{userEmail ? 'Good morning' : 'Your consistency starts here'}<span className="text-white/35">.</span></h1><p className="mt-2 text-sm text-white/55">{userEmail ? 'Keep the momentum. You are building something that lasts.' : 'Sign in to create your first live workspace.'}</p></div><div className="flex items-center gap-2">{!userEmail && <button onClick={() => setAuthOpen(true)} className="rounded-xl bg-[#171719] px-3 py-2 text-xs font-medium text-white">Sign in</button>}<button onClick={() => notify('Support is coming soon')} className="hidden items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-medium sm:flex"><CircleHelp className="size-4 text-white/65" /> Help</button></div></header><div className="mt-9 grid gap-4 sm:grid-cols-3"><Metric label="Today's progress" value={`${Math.round(completed / Math.max(total, 1) * 100)}%`} detail={`${completed} of ${total} habits complete`} icon={Check} /><Metric label="Current streak" value={active ? `${streak(active)} days` : '0 days'} detail="Live from your habit logs" icon={Flame} /><Metric label="All workspaces" value={`${overall}%`} detail="Calculated from this week" icon={TrendingUp} /></div>{active ? <><div className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]"><div className="rounded-2xl border border-white/15 bg-[#353538] p-5 shadow-xl sm:p-7"><div className="flex items-start justify-between"><div><p className="text-xs font-medium uppercase tracking-[0.18em] text-white/55">Consistency trend</p><div className="mt-2 flex items-end gap-3"><span className="text-3xl font-semibold">{completion(active)}%</span><span className="mb-1 text-xs text-white/60">last 7 days</span></div></div><span className="flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs text-white/65">Live <ChevronDown className="size-3.5" /></span></div><div className="mt-7 h-[190px] w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#eee' }} /><YAxis hide domain={[0, 100]} /><Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #777', background: '#171719', color: '#fff', fontSize: 12 }} /><Area type="monotone" dataKey="value" stroke="#fff" strokeWidth={2.5} fill="#fff" fillOpacity={0.12} /></AreaChart></ResponsiveContainer></div></div><div className="rounded-2xl bg-[#171719] p-6 text-white shadow-xl"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-[0.18em] text-white/45">Active workspace</p><h2 className="mt-2 text-xl font-semibold">{active.name}</h2></div><IconFor name={active.icon} /></div><p className="mt-2 text-sm text-white/50">{active.description}</p><div className="mt-8 flex items-end justify-between"><span className="text-4xl font-semibold">{completion(active)}%</span><span className="text-xs text-white/45">this week</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-white" style={{ width: `${completion(active)}%` }} /></div></div></div><div className="mt-8"><div className="flex items-end justify-between"><div><p className="text-xs font-medium uppercase tracking-[0.18em] text-white/55">Today's habits</p><h2 className="mt-2 text-xl font-semibold">{active.name}</h2></div><button onClick={addHabit} className="flex items-center gap-2 rounded-xl bg-[#171719] px-3 py-2 text-xs font-medium"><Plus className="size-3.5" /> Add habit</button></div><div className="mt-4 flex flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#353538]">{(showAll ? active.habits : active.habits.slice(0, 3)).map((habit, index) => { const done = active.logs.some((log) => log.habit_id === habit.id && log.completed_on === today); return <button key={habit.id} onClick={() => void toggleHabit(habit)} className="flex items-center gap-4 border-b border-white/10 px-5 py-4 text-left last:border-b-0 hover:bg-white/10"><span className={`flex size-6 shrink-0 items-center justify-center rounded-full border ${done ? 'border-[#171719] bg-[#171719] text-white' : 'border-white/45 text-transparent'}`}><Check className="size-3.5" /></span><span className="min-w-0 flex-1"><span className={`block text-sm font-medium ${done ? 'text-white/45 line-through' : ''}`}>{habit.name}</span><span className="mt-1 block text-xs text-white/55">{habit.frequency} · target {habit.target_per_week}/week</span></span><span className="hidden items-center gap-1.5 text-[11px] text-white/45 sm:flex"><Timer className="size-3.5" /> {index + 1} of {total}</span></button> })}{!active.habits.length && <EmptyState onAdd={addHabit} />}{active.habits.length > 3 && <button onClick={() => setShowAll(!showAll)} className="border-t border-white/10 px-5 py-3 text-xs font-medium text-white/60 hover:text-white">{showAll ? 'Show less' : `View all ${active.habits.length} habits`}</button>}</div></div></> : <EmptyState onAdd={addWorkspace} />}</>}{loading && <p className="mt-8 text-sm text-white/60">Loading your live data...</p>}</section></div>{toast && <div role="status" className="fixed bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-[#171719] px-4 py-2 text-xs font-medium text-white shadow-lg">{toast}</div>}{authOpen && <AuthDialog onClose={() => setAuthOpen(false)} />}</main>
}

function completion(workspace: Workspace) { return workspace.habits.length ? Math.round(workspace.habits.filter((habit) => workspace.logs.some((log) => log.habit_id === habit.id && log.completed_on === today)).length / workspace.habits.length * 100) : 0 }
function streak(workspace: Workspace) { let count = 0; for (let i = 0; i < 365; i++) { const date = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10); if (workspace.habits.length && workspace.habits.every((habit) => workspace.logs.some((log) => log.habit_id === habit.id && log.completed_on === date))) count++; else break } return count }
function IconFor({ name }: { name: string }) { const Icon = iconMap[name as keyof typeof iconMap] ?? LayoutGrid; return <Icon className="size-4" /> }
function NavButton({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: typeof LayoutGrid; children: string }) { return <button onClick={onClick} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium ${active ? 'bg-[#171719] text-white' : 'text-white/60 hover:bg-white/10'}`}><Icon className="size-4" />{children}</button> }
function Metric({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof Check }) { return <div className="rounded-2xl border border-white/15 bg-[#353538] p-5"><div className="flex items-center justify-between"><p className="text-xs text-white/60">{label}</p><Icon className="size-4 text-white/65" /></div><p className="mt-4 text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-white/55">{detail}</p></div> }
function EmptyState({ onAdd }: { onAdd: () => void }) { return <div className="flex flex-col items-center gap-3 px-5 py-12 text-center"><Target className="size-8 text-white/45" /><p className="text-sm font-medium">Nothing here yet</p><p className="max-w-xs text-xs text-white/55">Create a workspace and add habits to start tracking your real consistency.</p><button onClick={onAdd} className="mt-2 rounded-xl bg-[#171719] px-4 py-2.5 text-xs font-medium">Create workspace</button></div> }
function InsightsView({ workspaces }: { workspaces: Workspace[] }) { return <div><p className="text-xs uppercase tracking-[0.22em] text-white/55">Insights</p><h1 className="mt-2 text-3xl font-semibold">Your progress, live.</h1><p className="mt-2 text-sm text-white/55">Every number below is calculated from your Supabase habit logs.</p><div className="mt-8 grid gap-4 sm:grid-cols-2">{workspaces.map((workspace) => <div key={workspace.id} className="rounded-2xl border border-white/15 bg-[#353538] p-5"><p className="text-sm font-medium">{workspace.name}</p><p className="mt-4 text-4xl font-semibold">{completion(workspace)}%</p><p className="mt-1 text-xs text-white/55">{workspace.habits.length} tracked habits</p></div>)}{!workspaces.length && <EmptyState onAdd={() => undefined} />}</div></div> }
function SettingsView({ email, onSignOut }: { email: string | null; onSignOut: () => void }) { return <div><p className="text-xs uppercase tracking-[0.22em] text-white/55">Settings</p><h1 className="mt-2 text-3xl font-semibold">Account settings</h1><div className="mt-8 max-w-xl rounded-2xl border border-white/15 bg-[#353538] p-6"><p className="text-xs uppercase tracking-[0.18em] text-white/55">Signed in account</p><p className="mt-3 text-sm">{email ?? 'Not signed in'}</p>{email && <button onClick={onSignOut} className="mt-6 rounded-xl bg-[#171719] px-4 py-2.5 text-xs font-medium">Sign out</button>}</div></div> }
