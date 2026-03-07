'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AlertOctagon, UserCheck, Loader2, RefreshCw, Zap, Clock } from 'lucide-react'
import { PRIORITY_MAP, CATEGORY_MAP } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'

export default function UnassignedPage() {
  const supabase = createClient()
  const [tickets, setTickets] = useState<any[]>([])
  const [agents, setAgents]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState<string | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [bulkAgent, setBulkAgent] = useState('')
  const [assignMap, setAssignMap] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: t }, { data: a }, { data: counts }] = await Promise.all([
      supabase
        .from('tickets')
        .select('id, ticket_number, title, priority, category, created_at, created_by_profile:profiles!tickets_created_by_fkey(full_name,email)')
        .is('assigned_to', null)
        .in('status', ['open', 'in_progress', 'pending'])
        .order('created_at', { ascending: true }),
      supabase
        .from('profiles')
        .select('id, full_name, display_name')
        .in('role', ['agent', 'admin'])
        .eq('is_active', true),
      supabase
        .from('tickets')
        .select('assigned_to')
        .not('assigned_to', 'is', null)
        .in('status', ['open', 'in_progress', 'pending']),
    ])

    const countMap: Record<string, number> = {}
    counts?.forEach((c: any) => {
      countMap[c.assigned_to] = (countMap[c.assigned_to] || 0) + 1
    })

    setTickets(t || [])
    setAgents(
      (a || [])
        .map((ag: any) => ({ ...ag, open_count: countMap[ag.id] || 0 }))
        .sort((x: any, y: any) => x.open_count - y.open_count)
    )
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const assignOne = async (ticketId: string, agentId: string) => {
    if (!agentId) { toast.error('Selecciona un agente'); return }
    setSaving(ticketId)
    const { error } = await supabase.from('tickets')
      .update({ assigned_to: agentId, status: 'in_progress' })
      .eq('id', ticketId)
    if (error) { toast.error(error.message); setSaving(null); return }
    await supabase.from('activity_log').insert({
      action: 'ticket.assigned',
      target_type: 'ticket', target_id: ticketId,
      meta: { agent_id: agentId, source: 'admin_manual' },
    })
    toast.success('Ticket asignado')
    setTickets((p: any[]) => p.filter((t: any) => t.id !== ticketId))
    setSaving(null)
  }

  const autoAssign = async () => {
    if (!agents.length) { toast.error('No hay agentes disponibles'); return }
    setSaving('auto')
    const agentsCopy = agents.map((a: any) => ({ ...a }))
    let assigned = 0
    for (const ticket of tickets) {
      agentsCopy.sort((a: any, b: any) => a.open_count - b.open_count)
      const agent = agentsCopy[0]
      const { error } = await supabase.from('tickets')
        .update({ assigned_to: agent.id, status: 'in_progress' })
        .eq('id', ticket.id)
      if (!error) {
        await supabase.from('activity_log').insert({
          action: 'ticket.auto_assigned',
          target_type: 'ticket', target_id: ticket.id,
          meta: { agent_id: agent.id, source: 'auto_balance' },
        })
        agent.open_count++
        assigned++
      }
    }
    toast.success(`${assigned} tickets asignados automáticamente`)
    setSaving(null)
    load()
  }

  const bulkAssign = async () => {
    if (!bulkAgent) { toast.error('Selecciona un agente'); return }
    if (!selected.length) { toast.error('Selecciona al menos un ticket'); return }
    setSaving('bulk')
    const { error } = await supabase.from('tickets')
      .update({ assigned_to: bulkAgent, status: 'in_progress' })
      .in('id', selected)
    if (error) { toast.error(error.message); setSaving(null); return }
    toast.success(`${selected.length} tickets asignados`)
    setSelected([])
    setSaving(null)
    load()
  }

  const toggleSelect = (id: string) =>
    setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  const toggleAll = () =>
    setSelected(selected.length === tickets.length ? [] : tickets.map((t: any) => t.id))

  return (
    <div className="max-w-6xl mx-auto space-y-5 anim-fade">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-xl text-white flex items-center gap-2">
            <AlertOctagon size={20} style={{ color: '#f97316' }} />
            Tickets sin asignar
          </h1>
          <p className="text-[12.5px] mt-0.5" style={{ color: '#4a5f76' }}>
            {tickets.length} ticket{tickets.length !== 1 ? 's' : ''} esperando asignación
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn btn-ghost" style={{ padding: '7px 11px' }}>
            <RefreshCw size={13} />
          </button>
          <button onClick={autoAssign} disabled={saving === 'auto' || !tickets.length}
            className="btn btn-primary" style={{ background: '#f97316', borderColor: '#f97316' }}>
            {saving === 'auto' ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
            Auto-asignar todo
          </button>
        </div>
      </div>

      {/* Agent load */}
      {agents.length > 0 && (
        <div className="panel p-4">
          <div className="label-caps mb-3">Carga actual por agente</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {agents.map((agent: any) => (
              <div key={agent.id} className="flex items-center gap-2.5 p-2.5 rounded-md"
                style={{ background: 'var(--ink-700)', border: '1px solid var(--wire)' }}>
                <div className="w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold shrink-0"
                  style={{ background: 'var(--steel-dim)', color: 'var(--steel)' }}>
                  {(agent.display_name || agent.full_name || 'A')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium text-white truncate">
                    {agent.display_name || agent.full_name}
                  </div>
                </div>
                <span className="mono text-[11px] shrink-0"
                  style={{ color: agent.open_count > 5 ? '#f97316' : '#22c55e' }}>
                  {agent.open_count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bulk bar */}
      {selected.length > 0 && (
        <div className="panel p-3 flex items-center gap-3 anim-up"
          style={{ borderColor: 'rgba(61,142,240,.3)', background: 'rgba(61,142,240,.05)' }}>
          <span className="text-[12px]" style={{ color: 'var(--steel)' }}>
            {selected.length} seleccionado{selected.length !== 1 ? 's' : ''}
          </span>
          <select value={bulkAgent} onChange={e => setBulkAgent(e.target.value)}
            className="field flex-1 max-w-xs" style={{ fontSize: 12 }}>
            <option value="">— Asignar a agente —</option>
            {agents.map((a: any) => (
              <option key={a.id} value={a.id}>
                {a.display_name || a.full_name} ({a.open_count} activos)
              </option>
            ))}
          </select>
          <button onClick={bulkAssign} disabled={saving === 'bulk' || !bulkAgent}
            className="btn btn-primary" style={{ padding: '7px 12px', fontSize: 12 }}>
            {saving === 'bulk' ? <Loader2 size={12} className="animate-spin" /> : <UserCheck size={12} />}
            Asignar seleccionados
          </button>
          <button onClick={() => setSelected([])} className="btn btn-ghost" style={{ padding: '7px 11px', fontSize: 12 }}>
            Cancelar
          </button>
        </div>
      )}

      {/* Table */}
      <div className="panel overflow-hidden">
        {loading ? (
          <div className="p-10 text-center">
            <Loader2 size={20} className="animate-spin mx-auto" style={{ color: '#3d4e62' }} />
          </div>
        ) : !tickets.length ? (
          <div className="p-12 text-center">
            <AlertOctagon size={36} style={{ color: '#1f2937', margin: '0 auto 12px' }} />
            <p className="text-[13px]" style={{ color: '#3d4e62' }}>✓ Todos los tickets están asignados</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input type="checkbox"
                    checked={selected.length === tickets.length && tickets.length > 0}
                    onChange={toggleAll} className="accent-blue-500 cursor-pointer" />
                </th>
                <th>#</th>
                <th>Título</th>
                <th>Prioridad</th>
                <th>Categoría</th>
                <th>Solicitante</th>
                <th>Espera</th>
                <th>Asignar a</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket: any) => {
                const pr  = PRIORITY_MAP[ticket.priority as keyof typeof PRIORITY_MAP]
                const cat = CATEGORY_MAP[ticket.category as keyof typeof CATEGORY_MAP]
                const isSaving = saving === ticket.id
                const requester = Array.isArray(ticket.created_by_profile)
                  ? ticket.created_by_profile[0]
                  : ticket.created_by_profile
                return (
                  <tr key={ticket.id}>
                    <td>
                      <input type="checkbox"
                        checked={selected.includes(ticket.id)}
                        onChange={() => toggleSelect(ticket.id)}
                        className="accent-blue-500 cursor-pointer" />
                    </td>
                    <td className="mono text-[11px]" style={{ color: 'var(--steel)' }}>
                      #{ticket.ticket_number}
                    </td>
                    <td>
                      <a href={`/dashboard/tickets/${ticket.id}`} target="_blank" rel="noreferrer"
                        className="text-[13px] font-medium text-white hover:underline"
                        style={{ display: 'block', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ticket.title}
                      </a>
                    </td>
                    <td>
                      <span className="pill text-[10px]" style={{ background: pr?.bg, color: pr?.color }}>
                        {pr?.label}
                      </span>
                    </td>
                    <td className="text-[12px]" style={{ color: '#4a5f76' }}>
                      {cat?.icon} {cat?.label}
                    </td>
                    <td className="text-[12px]" style={{ color: '#7a8fa8' }}>
                      {requester?.full_name || requester?.email || '—'}
                    </td>
                    <td>
                      <span className="text-[11px] flex items-center gap-1" style={{ color: '#f97316' }}>
                        <Clock size={10} />
                        {formatDistanceToNow(new Date(ticket.created_at), { locale: es })}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <select
                          value={assignMap[ticket.id] || ''}
                          onChange={e => setAssignMap(p => ({ ...p, [ticket.id]: e.target.value }))}
                          className="field" style={{ fontSize: 11, padding: '4px 7px', minWidth: 130 }}>
                          <option value="">— Agente —</option>
                          {agents.map((a: any) => (
                            <option key={a.id} value={a.id}>
                              {a.display_name || a.full_name} ({a.open_count})
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => assignOne(ticket.id, assignMap[ticket.id])}
                          disabled={isSaving || !assignMap[ticket.id]}
                          className="btn btn-primary" style={{ padding: '4px 9px', fontSize: 11 }}>
                          {isSaving ? <Loader2 size={11} className="animate-spin" /> : <UserCheck size={11} />}
                        </button>
                      </div>
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
