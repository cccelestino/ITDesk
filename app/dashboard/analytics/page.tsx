import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { STATUS_MAP, PRIORITY_MAP, CATEGORY_MAP, TicketStatus, TicketPriority, TicketCategory } from '@/types'
import { BarChart2, TrendingUp, Clock, Users, Flame, type LucideIcon } from 'lucide-react'

export default async function AnalyticsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role === 'employee') redirect('/dashboard')

  const { data: tickets } = await supabase
    .from('tickets')
    .select('status, priority, category, created_at, resolved_at, sla_breached, assigned_to')

  const { count: rawAgentCount } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .in('role', ['agent', 'admin'])

  const agentCount: number = rawAgentCount ?? 0
  const total = tickets?.length ?? 0

  const statusC: Record<string, number> = {}
  const prioC:   Record<string, number> = {}
  const catC:    Record<string, number> = {}
  let resolutionMs = 0
  let resolvedN = 0

  tickets?.forEach(t => {
    statusC[t.status]   = (statusC[t.status]   ?? 0) + 1
    prioC[t.priority]   = (prioC[t.priority]   ?? 0) + 1
    catC[t.category]    = (catC[t.category]    ?? 0) + 1
    if (t.resolved_at && t.created_at) {
      resolutionMs += new Date(t.resolved_at).getTime() - new Date(t.created_at).getTime()
      resolvedN++
    }
  })

  const avgHours: string = resolvedN ? (resolutionMs / resolvedN / 36e5).toFixed(1) : '—'
  const slaBreached: number = tickets?.filter(t => t.sla_breached).length ?? 0
  const resolutionRate: number = total
    ? Math.round(((statusC.resolved ?? 0) + (statusC.closed ?? 0)) / total * 100)
    : 0

  interface KPI { label: string; value: string | number; icon: LucideIcon; color: string }
  const kpis: KPI[] = [
    { label: 'Total tickets',      value: total,              icon: BarChart2,  color: '#3d8ef0' },
    { label: 'Tasa de resolución', value: `${resolutionRate}%`, icon: TrendingUp, color: '#22c55e' },
    { label: 'Tiempo prom. res.',  value: `${avgHours}h`,     icon: Clock,      color: '#8b5cf6' },
    { label: 'SLA incumplidos',    value: slaBreached,        icon: Flame,      color: '#ef4444' },
    { label: 'Agentes activos',    value: agentCount,         icon: Users,      color: '#eab308' },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6 anim-fade">
      <div>
        <h1 className="font-display font-bold text-xl text-white">Analytics</h1>
        <p className="text-[12.5px] mt-0.5" style={{ color: '#4a5f76' }}>Rendimiento del equipo de soporte IT</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {kpis.map(({ label, value, icon: Icon, color }, i) => (
          <div key={label} className={`stat-card anim-up stagger-${Math.min(i + 1, 4)}`}>
            <div className="flex items-center justify-between">
              <span className="label-caps">{label}</span>
              <Icon size={13} style={{ color, opacity: .7 }} />
            </div>
            <div className="stat-value" style={{ color, fontSize: 24 }}>{String(value)}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Status */}
        <div className="panel">
          <div className="panel-header">
            <span className="text-[13px] font-semibold text-white">Por estado</span>
          </div>
          <div className="p-4 space-y-3">
            {(Object.keys(STATUS_MAP) as TicketStatus[]).map(s => {
              const cfg = STATUS_MAP[s]
              const n   = statusC[s] ?? 0
              const pct = total ? Math.round(n / total * 100) : 0
              return (
                <div key={s}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-[12px]" style={{ color: '#7a8fa8' }}>{cfg.label}</span>
                    <span className="mono text-[11px]" style={{ color: cfg.color }}>
                      {n} <span style={{ color: '#3d4e62' }}>({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--ink-700)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cfg.color, opacity: .8 }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Priority */}
        <div className="panel">
          <div className="panel-header">
            <span className="text-[13px] font-semibold text-white">Por prioridad</span>
          </div>
          <div className="p-4 space-y-3">
            {(Object.keys(PRIORITY_MAP) as TicketPriority[]).map(p => {
              const cfg = PRIORITY_MAP[p]
              const n   = prioC[p] ?? 0
              const pct = total ? Math.round(n / total * 100) : 0
              return (
                <div key={p}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-[12px]" style={{ color: '#7a8fa8' }}>{cfg.label}</span>
                    <span className="mono text-[11px]" style={{ color: cfg.color }}>
                      {n} <span style={{ color: '#3d4e62' }}>({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--ink-700)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cfg.color, opacity: .8 }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Category */}
        <div className="panel">
          <div className="panel-header">
            <span className="text-[13px] font-semibold text-white">Por categoría</span>
          </div>
          <div className="p-4 space-y-2">
            {Object.entries(catC)
              .sort(([, a], [, b]) => b - a)
              .map(([cat, n]) => {
                const cfg = CATEGORY_MAP[cat as TicketCategory]
                const pct = total ? Math.round(n / total * 100) : 0
                return (
                  <div key={cat} className="flex items-center justify-between py-0.5">
                    <span className="text-[12px]" style={{ color: '#5a6f88' }}>
                      {cfg?.icon} {cfg?.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--ink-700)' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#3d8ef0', opacity: .7 }} />
                      </div>
                      <span className="mono text-[10.5px] w-6 text-right" style={{ color: '#3d4e62' }}>{n}</span>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      </div>
    </div>
  )
}
