import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  UserCog, AlertOctagon, Building2, ScrollText,
  ShieldCheck, Users, Ticket, TrendingUp, ArrowRight,
} from 'lucide-react'
import Link from 'next/link'

export default async function AdminPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') redirect('/dashboard')

  // Quick stats
  const [
    { count: totalUsers },
    { count: activeAgents },
    { count: unassigned },
    { count: openTickets },
    { data: recentLogs },
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).in('role', ['agent', 'admin']).eq('is_active', true),
    supabase.from('tickets').select('id', { count: 'exact', head: true }).is('assigned_to', null).in('status', ['open', 'in_progress', 'pending']),
    supabase.from('tickets').select('id', { count: 'exact', head: true }).in('status', ['open', 'in_progress']),
    supabase.from('activity_log').select('action, created_at, actor:profiles(display_name, full_name)').order('created_at', { ascending: false }).limit(5),
  ])

  const cards = [
    {
      href: '/dashboard/admin/users',
      icon: UserCog, label: 'Gestión de usuarios',
      desc: 'Crear, editar roles, activar o desactivar cuentas',
      stat: String(totalUsers ?? 0), statLabel: 'usuarios totales',
      color: '#3d8ef0',
    },
    {
      href: '/dashboard/admin/unassigned',
      icon: AlertOctagon, label: 'Tickets sin asignar',
      desc: 'Asignar manualmente o usar auto-balanceo por carga',
      stat: String(unassigned ?? 0), statLabel: 'pendientes',
      color: unassigned ? '#f97316' : '#22c55e',
      alert: (unassigned ?? 0) > 0,
    },
    {
      href: '/dashboard/admin/departments',
      icon: Building2, label: 'Departamentos',
      desc: 'Configurar áreas y asignar colores de identificación',
      stat: '', statLabel: '',
      color: '#8b5cf6',
    },
    {
      href: '/dashboard/admin/logs',
      icon: ScrollText, label: 'Logs de actividad',
      desc: 'Auditoría completa de acciones administrativas',
      stat: '', statLabel: '',
      color: '#eab308',
    },
  ]

  const ACTION_LABELS: Record<string, string> = {
    'user.role_changed': 'cambió un rol',
    'user.activated': 'activó un usuario',
    'user.deactivated': 'desactivó un usuario',
    'ticket.assigned': 'asignó un ticket',
    'ticket.auto_assigned': 'auto-asignación ejecutada',
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 anim-fade">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)' }}>
          <ShieldCheck size={18} style={{ color: '#ef4444' }} />
        </div>
        <div>
          <h1 className="font-display font-bold text-xl text-white">Panel de administración</h1>
          <p className="text-[12.5px] mt-0.5" style={{ color: '#4a5f76' }}>
            Control total del sistema ITDesk
          </p>
        </div>
      </div>

      {/* Alert banner if unassigned tickets */}
      {(unassigned ?? 0) > 0 && (
        <Link href="/dashboard/admin/unassigned"
          className="flex items-center gap-3 p-3 rounded-lg anim-up"
          style={{ background: 'rgba(249,115,22,.08)', border: '1px solid rgba(249,115,22,.25)' }}>
          <AlertOctagon size={16} style={{ color: '#f97316', flexShrink: 0 }} />
          <p className="flex-1 text-[13px]" style={{ color: '#f97316' }}>
            <strong>{unassigned}</strong> ticket{(unassigned ?? 0) !== 1 ? 's' : ''} sin asignar están esperando atención
          </p>
          <ArrowRight size={14} style={{ color: '#f97316', flexShrink: 0 }} />
        </Link>
      )}

      {/* Quick stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Usuarios', value: totalUsers ?? 0, icon: Users, color: '#3d8ef0' },
          { label: 'Agentes activos', value: activeAgents ?? 0, icon: ShieldCheck, color: '#8b5cf6' },
          { label: 'Sin asignar', value: unassigned ?? 0, icon: AlertOctagon, color: '#f97316' },
          { label: 'Tickets abiertos', value: openTickets ?? 0, icon: Ticket, color: '#eab308' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <div className="flex items-center justify-between">
              <span className="label-caps">{label}</span>
              <Icon size={13} style={{ color, opacity: .7 }} />
            </div>
            <div className="stat-value" style={{ color, fontSize: 26 }}>{String(value)}</div>
          </div>
        ))}
      </div>

      {/* Admin modules grid */}
      <div className="grid md:grid-cols-2 gap-3">
        {cards.map(({ href, icon: Icon, label, desc, stat, statLabel, color, alert }) => (
          <Link key={href} href={href}
            className="panel p-5 flex gap-4 group transition-all"
            style={{ borderColor: alert ? 'rgba(249,115,22,.3)' : undefined }}
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: color + '15', border: `1px solid ${color}25` }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[14px] font-semibold text-white group-hover:underline">{label}</span>
                <ArrowRight size={13} style={{ color: '#3d4e62' }} />
              </div>
              <p className="text-[12px] leading-relaxed" style={{ color: '#4a5f76' }}>{desc}</p>
              {stat && (
                <div className="mt-2">
                  <span className="mono text-[18px] font-bold" style={{ color }}>{stat}</span>
                  <span className="text-[11px] ml-1.5" style={{ color: '#3d4e62' }}>{statLabel}</span>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Recent activity */}
      {recentLogs && recentLogs.length > 0 && (
        <div className="panel">
          <div className="panel-header">
            <span className="text-[13px] font-semibold text-white flex items-center gap-2">
              <TrendingUp size={13} style={{ color: '#3d4e62' }} />
              Actividad reciente
            </span>
            <Link href="/dashboard/admin/logs"
              className="text-[11.5px] flex items-center gap-1" style={{ color: 'var(--steel)' }}>
              Ver todo <ArrowRight size={11} />
            </Link>
          </div>
          <div className="divide-y" style={{ borderColor: '#12151a' }}>
            {recentLogs.map((log: any) => (
              <div key={log.id} className="px-4 py-2.5 flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#3d4e62' }} />
                <span className="text-[12px] flex-1" style={{ color: '#5a6f88' }}>
                  <strong style={{ color: '#7a8fa8' }}>
                    {(log.actor as any)?.display_name || (log.actor as any)?.full_name || 'Sistema'}
                  </strong>
                  {' '}{ACTION_LABELS[log.action] || log.action}
                </span>
                <span className="text-[10.5px]" style={{ color: '#2e3846' }}>
                  {new Date(log.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
