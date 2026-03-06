import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { STATUS_MAP, PRIORITY_MAP, CATEGORY_MAP, TicketStatus, TicketPriority, TicketCategory } from '@/types'
import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowLeft, Clock, User, Monitor, MapPin, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import CommentThread from '@/components/tickets/CommentThread'
import AgentPanel    from '@/components/tickets/AgentPanel'

export default async function TicketDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAgent = profile?.role === 'agent' || profile?.role === 'admin'

  const { data: ticket } = await supabase
    .from('tickets')
    .select(`*, created_by_profile:profiles!tickets_created_by_fkey(*), assigned_to_profile:profiles!tickets_assigned_to_fkey(*), department:departments(*)`)
    .eq('id', params.id)
    .single()

  if (!ticket) notFound()
  if (!isAgent && ticket.created_by !== user.id) notFound()

  const { data: comments } = await supabase
    .from('ticket_comments')
    .select(`*, author:profiles(*)`)
    .eq('ticket_id', params.id)
    .order('created_at', { ascending: true })

  const { data: history } = await supabase
    .from('ticket_history')
    .select(`*, actor:profiles(display_name, full_name)`)
    .eq('ticket_id', params.id)
    .order('created_at', { ascending: false })
    .limit(12)

  const st  = STATUS_MAP[ticket.status as TicketStatus]
  const pr  = PRIORITY_MAP[ticket.priority as TicketPriority]
  const cat = CATEGORY_MAP[ticket.category as TicketCategory]

  return (
    <div className="max-w-6xl mx-auto anim-fade">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-5">
        <Link href="/dashboard/tickets" className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: 12 }}>
          <ArrowLeft size={12} /> Tickets
        </Link>
        <span style={{ color: '#3d4e62', fontSize: 12 }}>/</span>
        <span className="mono text-[12px]" style={{ color: 'var(--steel)' }}>#{ticket.ticket_number}</span>
        {ticket.sla_breached && (
          <span className="pill" style={{ background:'rgba(239,68,68,.1)', color:'#ef4444', borderColor:'rgba(239,68,68,.2)', fontSize:10 }}>
            <AlertCircle size={9} /> SLA incumplido
          </span>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* ── Main ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Ticket header */}
          <div className="panel p-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <h1 className="font-display font-bold text-[18px] text-white leading-snug flex-1">
                {ticket.title}
              </h1>
              <div className="flex gap-2 shrink-0">
                <span className="pill" style={{ background: st.bg, color: st.color, borderColor: st.border }}>
                  <span className="pill-dot" style={{ background: st.dot }} />
                  {st.label}
                </span>
                <span className="pill" style={{ background: pr.bg, color: pr.color }}>
                  {pr.label}
                </span>
              </div>
            </div>
            <div className="divider mb-4" />
            <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap" style={{ color: '#8fa3be' }}>
              {ticket.description}
            </p>
          </div>

          {/* Comments */}
          <CommentThread
            ticketId={ticket.id}
            comments={comments || []}
            currentUserId={user.id}
            isAgent={isAgent}
          />
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-4">
          {/* Ticket meta */}
          <div className="panel">
            <div className="panel-header">
              <span className="text-[12.5px] font-semibold text-white">Detalles</span>
            </div>
            <div className="p-4 space-y-3.5">
              <MetaRow icon={User} label="Solicitante">
                {ticket.created_by_profile?.full_name || ticket.created_by_profile?.email}
              </MetaRow>
              <MetaRow icon={User} label="Asignado a" accent>
                {ticket.assigned_to_profile?.full_name || <span style={{ color: '#3d4e62' }}>Sin asignar</span>}
              </MetaRow>
              <MetaRow icon={Clock} label="Creado">
                {format(new Date(ticket.created_at), 'd MMM yyyy, HH:mm', { locale: es })}
              </MetaRow>
              {ticket.first_response_at && (
                <MetaRow icon={Clock} label="1ª respuesta">
                  {formatDistanceToNow(new Date(ticket.created_at), { locale: es })} después
                </MetaRow>
              )}
              <div className="divider" />
              <div className="flex items-center gap-2">
                <span className="label-caps" style={{ minWidth: 80 }}>Categoría</span>
                <span className="text-[12px]" style={{ color: '#7a8fa8' }}>{cat?.icon} {cat?.label}</span>
              </div>
              {ticket.device_info && (
                <MetaRow icon={Monitor} label="Dispositivo">
                  <span className="mono text-[11.5px]">{ticket.device_info}</span>
                </MetaRow>
              )}
              {ticket.location && (
                <MetaRow icon={MapPin} label="Ubicación">{ticket.location}</MetaRow>
              )}
            </div>
          </div>

          {/* Agent actions */}
          {isAgent && <AgentPanel ticket={ticket} currentUserId={user.id} />}

          {/* History */}
          {!!history?.length && (
            <div className="panel">
              <div className="panel-header">
                <span className="text-[12.5px] font-semibold text-white">Historial</span>
              </div>
              <div className="p-4 space-y-3">
                {history.map((h: any) => (
                  <div key={h.id} className="text-[11.5px]" style={{ color: '#3d4e62' }}>
                    <span style={{ color: '#5a6f88' }}>{h.actor?.display_name || h.actor?.full_name}</span>
                    {' '}{actionLabel(h.action)}{' '}
                    {h.old_val && <><span>{h.old_val}</span> → </>}
                    <span style={{ color: '#7a8fa8' }}>{h.new_val}</span>
                    <div style={{ fontSize: 10, marginTop: 2, color: '#252d38' }}>
                      {formatDistanceToNow(new Date(h.created_at), { addSuffix: true, locale: es })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MetaRow({ icon: Icon, label, children, accent }: {
  icon: any; label: string; children: React.ReactNode; accent?: boolean
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={13} style={{ color: accent ? 'var(--steel)' : '#3d4e62', marginTop: 2, flexShrink: 0 }} />
      <div>
        <div className="label-caps" style={{ marginBottom: 2 }}>{label}</div>
        <div className="text-[12.5px]" style={{ color: accent ? 'var(--steel)' : '#8fa3be' }}>{children}</div>
      </div>
    </div>
  )
}

function actionLabel(action: string) {
  const map: Record<string, string> = {
    status_changed:   'cambió el estado a',
    priority_changed: 'cambió la prioridad a',
    assigned:         'asignó el ticket a',
  }
  return map[action] || action
}
