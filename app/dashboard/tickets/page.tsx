import { createClient } from '@/lib/supabase/server'
import { STATUS_MAP, PRIORITY_MAP, CATEGORY_MAP, TicketStatus, TicketPriority, TicketCategory } from '@/types'
import { Plus, Filter, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: { status?: string; priority?: string; category?: string; q?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAgent = profile?.role === 'agent' || profile?.role === 'admin'

  let query = supabase
    .from('tickets')
    .select(`
      id, ticket_number, title, status, priority, category,
      created_at, sla_breached, device_info, location,
      created_by_profile:profiles!tickets_created_by_fkey(full_name, email, display_name),
      assigned_to_profile:profiles!tickets_assigned_to_fkey(full_name, display_name)
    `)
    .order('created_at', { ascending: false })

  if (!isAgent) query = query.eq('created_by', user.id)
  if (searchParams.status)   query = query.eq('status', searchParams.status)
  if (searchParams.priority) query = query.eq('priority', searchParams.priority)
  if (searchParams.category) query = query.eq('category', searchParams.category)
  if (searchParams.q)        query = query.ilike('title', `%${searchParams.q}%`)

  const { data: tickets } = await query
  const total = tickets?.length || 0

  const buildHref = (extra: Record<string, string>) => {
    const p = new URLSearchParams()
    if (searchParams.status && !('status' in extra))   p.set('status', searchParams.status)
    if (searchParams.priority && !('priority' in extra)) p.set('priority', searchParams.priority)
    if (searchParams.category && !('category' in extra)) p.set('category', searchParams.category)
    Object.entries(extra).forEach(([k, v]) => v && p.set(k, v))
    return `/dashboard/tickets?${p.toString()}`
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4 anim-fade">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-xl text-white">Tickets</h1>
          <p className="text-[12.5px] mt-0.5" style={{ color: '#4a5f76' }}>
            {total} resultado{total !== 1 ? 's' : ''}
            {Object.values(searchParams).some(Boolean) && ' (filtrado)'}
          </p>
        </div>
        <Link href="/dashboard/tickets/new" className="btn btn-primary">
          <Plus size={13} /> Nuevo ticket
        </Link>
      </div>

      {/* Filters */}
      <div className="panel p-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 label-caps" style={{ color: '#3d4e62' }}>
            <Filter size={11} /> Filtros
          </div>

          {/* Status */}
          <div className="flex gap-1 flex-wrap">
            <Link href="/dashboard/tickets" className={`pill ${!searchParams.status ? 'active' : ''}`}
              style={{
                background: !searchParams.status ? 'var(--steel-dim)' : 'var(--ink-700)',
                color: !searchParams.status ? 'var(--steel)' : '#4a5f76',
                border: `1px solid ${!searchParams.status ? 'var(--steel-b)' : 'var(--wire)'}`,
                cursor: 'pointer', padding: '4px 10px',
              }}>
              Todos
            </Link>
            {(Object.entries(STATUS_MAP) as [TicketStatus, typeof STATUS_MAP[TicketStatus]][]).map(([k, cfg]) => (
              <Link
                key={k}
                href={buildHref({ status: k })}
                className="pill"
                style={{
                  background: searchParams.status === k ? cfg.bg : 'var(--ink-700)',
                  color: searchParams.status === k ? cfg.color : '#4a5f76',
                  borderColor: searchParams.status === k ? cfg.border : 'var(--wire)',
                  cursor: 'pointer', padding: '4px 10px',
                }}
              >
                {cfg.label}
              </Link>
            ))}
          </div>

          <div style={{ width: 1, height: 16, background: 'var(--wire)' }} />

          {/* Priority */}
          <div className="flex gap-1 flex-wrap">
            {(Object.entries(PRIORITY_MAP) as [TicketPriority, typeof PRIORITY_MAP[TicketPriority]][]).map(([k, cfg]) => (
              <Link
                key={k}
                href={buildHref({ priority: k })}
                className="pill"
                style={{
                  background: searchParams.priority === k ? cfg.bg : 'var(--ink-700)',
                  color: searchParams.priority === k ? cfg.color : '#4a5f76',
                  borderColor: 'var(--wire)',
                  cursor: 'pointer', padding: '4px 10px',
                }}
              >
                {cfg.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="panel overflow-hidden">
        {!total ? (
          <div className="p-12 text-center">
            <Filter size={36} style={{ color: '#1f2937', margin: '0 auto 12px' }} />
            <p style={{ color: '#3d4e62', fontSize: 13 }}>Sin tickets para estos filtros</p>
            <Link href="/dashboard/tickets/new" className="btn btn-primary mt-4 inline-flex">
              <Plus size={13} /> Crear ticket
            </Link>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 70 }}>#</th>
                <th>Título / Dispositivo</th>
                <th>Categoría</th>
                <th>Estado</th>
                <th>Prioridad</th>
                <th>{isAgent ? 'Solicitante' : 'Asignado a'}</th>
                <th>Creado</th>
              </tr>
            </thead>
            <tbody>
              {tickets?.map((t: any) => {
                const st  = STATUS_MAP[t.status as TicketStatus]
                const pr  = PRIORITY_MAP[t.priority as TicketPriority]
                const cat = CATEGORY_MAP[t.category as TicketCategory]
                return (
                  <tr key={t.id}>
                    <td>
                      <div className="flex flex-col gap-0.5">
                        <Link
                          href={`/dashboard/tickets/${t.id}`}
                          className="mono text-[11px] hover:underline"
                          style={{ color: 'var(--steel)' }}
                        >
                          #{t.ticket_number}
                        </Link>
                        {t.sla_breached && (
                          <span style={{ fontSize: 9, color: '#ef4444', display:'flex', alignItems:'center', gap:2 }}>
                            <AlertCircle size={8} /> SLA
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <Link
                        href={`/dashboard/tickets/${t.id}`}
                        className="text-[13px] font-medium text-white hover:underline"
                        style={{ display: 'block', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {t.title}
                      </Link>
                      {t.device_info && (
                        <span className="mono text-[10px]" style={{ color: '#3d4e62' }}>{t.device_info}</span>
                      )}
                    </td>
                    <td>
                      <span className="text-[12px]" style={{ color: '#4a5f76' }}>
                        {cat?.icon} {cat?.label}
                      </span>
                    </td>
                    <td>
                      <span className="pill" style={{ background: st.bg, color: st.color, borderColor: st.border }}>
                        <span className="pill-dot" style={{ background: st.dot }} />
                        {st.label}
                      </span>
                    </td>
                    <td>
                      <span className="pill" style={{ background: pr.bg, color: pr.color }}>
                        {pr.label}
                      </span>
                    </td>
                    <td className="text-[12px]" style={{ color: '#7a8fa8' }}>
                      {isAgent
                        ? t.created_by_profile?.display_name || t.created_by_profile?.full_name
                        : t.assigned_to_profile?.display_name || t.assigned_to_profile?.full_name || '—'}
                    </td>
                    <td className="text-[11.5px]" style={{ color: '#3d4e62' }}>
                      {formatDistanceToNow(new Date(t.created_at), { addSuffix: true, locale: es })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
