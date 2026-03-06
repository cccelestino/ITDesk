'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { STATUS_MAP, PRIORITY_MAP, TicketStatus, TicketPriority } from '@/types'
import { Loader2, UserCheck, CheckCircle, XCircle, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

export default function AgentPanel({ ticket, currentUserId }: { ticket: any; currentUserId: string }) {
  const [loading, setLoading]   = useState(false)
  const [agents, setAgents]     = useState<any[]>([])
  const [assignTo, setAssignTo] = useState(ticket.assigned_to || '')
  const supabase = createClient()
  const router   = useRouter()

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, full_name, display_name, email')
      .in('role', ['agent', 'admin'])
      .eq('is_active', true)
      .then(({ data }) => setAgents(data || []))
  }, [])

  const update = async (fields: Record<string, any>) => {
    setLoading(true)
    try {
      const { error } = await supabase.from('tickets').update(fields).eq('id', ticket.id)
      if (error) throw error
      toast.success('Ticket actualizado')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const statuses: TicketStatus[]   = ['open','in_progress','pending','resolved','closed']
  const priorities: TicketPriority[] = ['low','medium','high','critical']

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="text-[12.5px] font-semibold text-white flex items-center gap-2">
          {loading && <Loader2 size={12} className="animate-spin" />}
          Panel del agente
        </span>
      </div>
      <div className="p-4 space-y-5">

        {/* Assign */}
        <div>
          <label className="label-caps block mb-2 flex items-center gap-1.5">
            <Users size={10} /> Asignar a
          </label>
          <div className="flex gap-2">
            <select
              value={assignTo}
              onChange={e => setAssignTo(e.target.value)}
              className="field flex-1"
              style={{ fontSize: 12 }}
            >
              <option value="">— Sin asignar —</option>
              {agents.map(a => (
                <option key={a.id} value={a.id}>
                  {a.display_name || a.full_name || a.email}
                </option>
              ))}
            </select>
            <button
              disabled={loading}
              onClick={() => update({ assigned_to: assignTo || null })}
              className="btn btn-ghost"
              style={{ padding: '7px 11px', fontSize: 12, flexShrink: 0 }}
            >
              <UserCheck size={13} />
            </button>
          </div>
          {ticket.assigned_to !== currentUserId && (
            <button
              disabled={loading}
              onClick={() => { setAssignTo(currentUserId); update({ assigned_to: currentUserId }) }}
              className="text-[11px] mt-1.5"
              style={{ color: 'var(--steel)', cursor: 'pointer', background: 'none', border: 'none' }}
            >
              ← Asignarme
            </button>
          )}
        </div>

        {/* Status */}
        <div>
          <label className="label-caps block mb-2">Estado</label>
          <div className="space-y-1">
            {statuses.map(s => {
              const cfg = STATUS_MAP[s]
              const active = ticket.status === s
              return (
                <button
                  key={s}
                  disabled={loading || active}
                  onClick={() => update({ status: s, ...(s === 'resolved' ? { resolved_at: new Date().toISOString() } : {}), ...(s === 'closed' ? { closed_at: new Date().toISOString() } : {}) })}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded text-left transition-all"
                  style={{
                    background: active ? cfg.bg : 'transparent',
                    color: active ? cfg.color : '#4a5f76',
                    border: `1px solid ${active ? cfg.border : 'var(--wire)'}`,
                    fontSize: 12,
                    cursor: active ? 'default' : 'pointer',
                  }}
                >
                  <span
                    style={{
                      width: 5, height: 5, borderRadius: '50%',
                      background: cfg.dot, flexShrink: 0,
                      opacity: active ? 1 : 0.4,
                    }}
                  />
                  {cfg.label}
                  {active && <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.5 }}>actual</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="label-caps block mb-2">Prioridad</label>
          <div className="grid grid-cols-2 gap-1.5">
            {priorities.map(p => {
              const cfg = PRIORITY_MAP[p]
              const active = ticket.priority === p
              return (
                <button
                  key={p}
                  disabled={loading || active}
                  onClick={() => update({ priority: p })}
                  className="pill justify-center"
                  style={{
                    padding: '6px 4px',
                    background: active ? cfg.bg : 'var(--ink-700)',
                    color: active ? cfg.color : '#4a5f76',
                    border: `1px solid ${active ? cfg.color + '40' : 'var(--wire)'}`,
                    cursor: active ? 'default' : 'pointer',
                    transition: 'all .14s',
                    fontSize: 11.5,
                  }}
                >
                  {cfg.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            disabled={loading || ticket.status === 'resolved'}
            onClick={() => update({ status: 'resolved', resolved_at: new Date().toISOString() })}
            className="btn btn-success"
            style={{ fontSize: 11.5, padding: '7px 8px', justifyContent: 'center' }}
          >
            <CheckCircle size={12} /> Resolver
          </button>
          <button
            disabled={loading || ticket.status === 'closed'}
            onClick={() => update({ status: 'closed', closed_at: new Date().toISOString() })}
            className="btn btn-ghost"
            style={{ fontSize: 11.5, padding: '7px 8px', justifyContent: 'center' }}
          >
            <XCircle size={12} /> Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
