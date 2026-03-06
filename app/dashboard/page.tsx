import { createClient } from '@/lib/supabase/server'
import { STATUS_MAP, PRIORITY_MAP, TicketStatus, TicketPriority, CATEGORY_MAP, TicketCategory } from '@/types'
import { Ticket, Clock, CheckCircle2, AlertTriangle, Flame, Plus, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const isAgent = profile?.role === 'agent' || profile?.role === 'admin'

  // Counts
  let baseQ = supabase.from('tickets').select('status, priority, category, created_at')
  if (!isAgent) baseQ = baseQ.eq('created_by', user.id)
  const { data: allTickets } = await baseQ

  const counts = { open:0, in_progress:0, pending:0, resolved:0, closed:0 }
  const prioCounts = { low:0, medium:0, high:0, critical:0 }
  const catCounts: Record<string, number> = {}

  allTickets?.forEach(t => {
    counts[t.status as TicketStatus]++
    prioCounts[t.priority as TicketPriority]++
    catCounts[t.category] = (catCounts[t.category] || 0) + 1
  })

  const total = allTickets?.length || 0

  // Recent tickets
  let recentQ = supabase.from('tickets').select(`
    id, ticket_number, title, status, priority, category, created_at,
    created_by_profile:profiles!tickets_created_by_fkey(full_name, email),
    assigned_to_profile:profiles!tickets_assigned_to_fkey(full_name)
  `).order('created_at', { ascending: false }).limit(8)
  if (!isAgent) recentQ = recentQ.eq('created_by', user.id)
  const { data: recent } = await recentQ

  // SLA breached
  const { count: breached } = await supabase
    .from('tickets')
    .select('id', { count: 'exact', head: true })
    .eq('sla_breached', true)
    .in('status', ['open', 'in_progress'])

  const stats = [
    { label: 'Total abiertos',  value: counts.open,        icon: Ticket,       color: '#3d8ef0' },
    { label: 'En progreso',     value: counts.in_progress,  icon: Clock,        color: '#8b5cf6' },
    { label: 'Resueltos',       value: counts.resolved,     icon: CheckCircle2, color: '#22c55e' },
    { label: 'SLA incumplidos', value: breached || 0,       icon: Flame,        color: '#ef4444' },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6 anim-fade">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-xl text-white">
            {isAgent ? 'Panel de operaciones' : 'Mis tickets'}
          </h1>
          <p className="text-[12.5px] mt-0.5" style={{ color: '#4a5f76' }}>
            {isAgent
              ? `${total} ticket${total !== 1 ? 's' : ''} en el sistema`
              : `Resumen de tus solicitudes de soporte`}
          </p>
        </div>
        <Link href="/dashboard/tickets/new" className="btn btn-primary">
          <Plus size={14} /> Nuevo ticket
        </Link>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(({ label, value, icon: Icon, color }, i) => (
          <div key={label} className={`stat-card anim-up stagger-${i+1}`}>
            <div className="flex items-center justify-between">
              <span className="label-caps">{label}</span>
              <Icon size={14} style={{ color, opacity: .7 }} />
            </div>
            <div className="stat-value" style={{ color }}>{value}</div>
            {total > 0 && (
              <div className="label-caps" style={{ color: '#3d4e62' }}>
                {Math.round(value / total * 100)}% del total
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Recent tickets (2/3) */}
        <div className="lg:col-span-2 panel overflow-hidden">
          <div className="panel-header">
            <span className="text-[13px] font-semibold text-white">Tickets recientes</span>
            <Link
              href="/dashboard/tickets"
              className="text-[11.5px] flex items-center gap-1"
              style={{ color: 'var(--steel)' }}
            >
              Ver todos <ArrowRight size={11} />
            </Link>
          </div>

          {!recent?.length ? (
            <div className="p-10 text-center">
              <Ticket size={36} style={{ color: '#1f2937', margin: '0 auto 12px' }} />
              <p style={{ color: '#3d4e62', fontSize: 13 }}>Sin tickets todavía</p>
              <Link href="/dashboard/tickets/new" className="btn btn-primary mt-4 inline-flex">
                <Plus size={13} /> Crear primer ticket
              </Link>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Título</th>
                  <th>Estado</th>
                  <th>Prioridad</th>
                  <th>Categoría</th>
                  <th>Creado</th>
                </tr>
              </thead>
              <tbody>
                {recent?.map((t: any) => {
                  const st = STATUS_MAP[t.status as TicketStatus]
                  const pr = PRIORITY_MAP[t.priority as TicketPriority]
                  const cat = CATEGORY_MAP[t.category as TicketCategory]
                  return (
                    <tr key={t.id} style={{ cursor: 'pointer' }}>
                      <td>
                        <Link href={`/dashboard/tickets/${t.id}`} className="mono text-[11px]" style={{ color: '#3d4e62' }}>
                          #{t.ticket_number}
                        </Link>
                      </td>
                      <td>
                        <Link
                          href={`/dashboard/tickets/${t.id}`}
                          className="text-[13px] font-medium text-white hover:underline"
                          style={{ display: 'block', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {t.title}
                        </Link>
                      </td>
                      <td>
                        <span
                          className="pill"
                          style={{ background: st.bg, color: st.color, borderColor: st.border }}
                        >
                          <span className="pill-dot" style={{ background: st.dot }} />
                          {st.label}
                        </span>
                      </td>
                      <td>
                        <span className="pill" style={{ background: pr.bg, color: pr.color }}>
                          {pr.label}
                        </span>
                      </td>
                      <td>
                        <span className="text-[12px]" style={{ color: '#4a5f76' }}>
                          {cat?.icon} {cat?.label}
                        </span>
                      </td>
                      <td>
                        <span className="text-[11.5px]" style={{ color: '#3d4e62' }}>
                          {formatDistanceToNow(new Date(t.created_at), { addSuffix: true, locale: es })}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Right column (1/3) */}
        <div className="space-y-4">
          {/* Status breakdown */}
          <div className="panel">
            <div className="panel-header">
              <span className="text-[13px] font-semibold text-white">Por estado</span>
            </div>
            <div className="p-4 space-y-3">
              {(Object.entries(counts) as [TicketStatus, number][]).map(([status, count]) => {
                const cfg = STATUS_MAP[status]
                const pct = total ? Math.round(count / total * 100) : 0
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[12px]" style={{ color: '#7a8fa8' }}>{cfg.label}</span>
                      <span className="mono text-[11px]" style={{ color: cfg.color }}>{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--ink-700)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: cfg.color, opacity: 0.8 }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Category breakdown */}
          <div className="panel">
            <div className="panel-header">
              <span className="text-[13px] font-semibold text-white">Por categoría</span>
            </div>
            <div className="p-4 space-y-1.5">
              {Object.entries(catCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([cat, count]) => {
                  const cfg = CATEGORY_MAP[cat as TicketCategory]
                  return (
                    <div key={cat} className="flex items-center justify-between py-1">
                      <span className="text-[12px]" style={{ color: '#4a5f76' }}>
                        {cfg?.icon} {cfg?.label || cat}
                      </span>
                      <span
                        className="mono text-[11px] px-2 py-0.5 rounded"
                        style={{ background: 'var(--ink-700)', color: '#7a8fa8' }}
                      >
                        {count}
                      </span>
                    </div>
                  )
                })}
              {Object.keys(catCounts).length === 0 && (
                <p className="text-center py-4" style={{ color: '#3d4e62', fontSize: 12 }}>Sin datos</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
