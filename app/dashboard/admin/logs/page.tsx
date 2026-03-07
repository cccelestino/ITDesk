'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ScrollText, RefreshCw, Loader2, Filter } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

interface LogEntry {
  id: string
  action: string
  target_type: string | null
  target_id: string | null
  meta: Record<string, any>
  created_at: string
  actor: { full_name: string | null; email: string; display_name: string | null } | null
}

const ACTION_CFG: Record<string, { label: string; color: string; icon: string }> = {
  'user.role_changed':    { label: 'Rol cambiado',         color: '#8b5cf6', icon: '👤' },
  'user.activated':       { label: 'Usuario activado',     color: '#22c55e', icon: '✅' },
  'user.deactivated':     { label: 'Usuario desactivado',  color: '#ef4444', icon: '🚫' },
  'ticket.assigned':      { label: 'Ticket asignado',      color: '#3d8ef0', icon: '🎫' },
  'ticket.auto_assigned': { label: 'Auto-asignación',      color: '#f97316', icon: '⚡' },
  'ticket.status_changed':{ label: 'Estado cambiado',      color: '#eab308', icon: '🔄' },
}

const ACTION_FILTERS = ['Todos', ...Object.keys(ACTION_CFG)]

export default function LogsPage() {
  const supabase = createClient()
  const [logs, setLogs]       = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('Todos')
  const [page, setPage]       = useState(0)
  const PAGE_SIZE = 50

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('activity_log')
      .select('*, actor:profiles(full_name, email, display_name)')
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (filter !== 'Todos') q = q.eq('action', filter)

    const { data } = await q
    setLogs((data as LogEntry[]) || [])
    setLoading(false)
  }, [filter, page])

  useEffect(() => { load() }, [load])

  const getLabel = (action: string) => ACTION_CFG[action]?.label || action
  const getColor = (action: string) => ACTION_CFG[action]?.color || '#4a5f76'
  const getIcon  = (action: string) => ACTION_CFG[action]?.icon || '📋'

  const renderMeta = (action: string, meta: Record<string, any>) => {
    if (action === 'user.role_changed') return `→ ${meta.new_role}`
    if (action === 'ticket.assigned' || action === 'ticket.auto_assigned') return `agente: ${meta.agent_id?.slice(0, 8)}...`
    return ''
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5 anim-fade">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-xl text-white flex items-center gap-2">
            <ScrollText size={20} style={{ color: 'var(--steel)' }} />
            Logs de actividad
          </h1>
          <p className="text-[12.5px] mt-0.5" style={{ color: '#4a5f76' }}>
            Registro de todas las acciones administrativas
          </p>
        </div>
        <button onClick={load} className="btn btn-ghost" style={{ padding: '7px 11px' }}>
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Filters */}
      <div className="panel p-3 flex items-center gap-2 flex-wrap">
        <Filter size={11} style={{ color: '#3d4e62' }} />
        {ACTION_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(0) }}
            className="pill cursor-pointer text-[10.5px]"
            style={{
              padding: '4px 10px',
              background: filter === f ? 'var(--steel-dim)' : 'var(--ink-700)',
              color: filter === f ? 'var(--steel)' : '#4a5f76',
              border: `1px solid ${filter === f ? 'var(--steel-b)' : 'var(--wire)'}`,
            }}
          >
            {f === 'Todos' ? f : ACTION_CFG[f]?.label || f}
          </button>
        ))}
      </div>

      {/* Log table */}
      <div className="panel overflow-hidden">
        {loading ? (
          <div className="p-10 text-center">
            <Loader2 size={20} className="animate-spin mx-auto" style={{ color: '#3d4e62' }} />
          </div>
        ) : !logs.length ? (
          <div className="p-10 text-center" style={{ color: '#3d4e62', fontSize: 13 }}>
            Sin registros para este filtro
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Acción</th>
                <th>Actor</th>
                <th>Objetivo</th>
                <th>Detalle</th>
                <th>Hace</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td>
                    <span className="pill text-[10.5px]" style={{
                      background: getColor(log.action) + '18',
                      color: getColor(log.action),
                      borderColor: getColor(log.action) + '30',
                    }}>
                      {getIcon(log.action)} {getLabel(log.action)}
                    </span>
                  </td>
                  <td>
                    <span className="text-[12px]" style={{ color: '#7a8fa8' }}>
                      {log.actor?.display_name || log.actor?.full_name || log.actor?.email || 'Sistema'}
                    </span>
                  </td>
                  <td>
                    <span className="mono text-[11px]" style={{ color: '#4a5f76' }}>
                      {log.target_type && `${log.target_type}`}
                      {log.target_id && ` · ${log.target_id.slice(0, 8)}...`}
                    </span>
                  </td>
                  <td>
                    <span className="mono text-[11px]" style={{ color: '#3d4e62' }}>
                      {renderMeta(log.action, log.meta)}
                    </span>
                  </td>
                  <td className="text-[11.5px]" style={{ color: '#3d4e62' }}>
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: es })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
          className="btn btn-ghost" style={{ fontSize: 12 }}>
          ← Anterior
        </button>
        <span className="text-[12px]" style={{ color: '#3d4e62' }}>
          Página {page + 1}
        </span>
        <button disabled={logs.length < PAGE_SIZE} onClick={() => setPage(p => p + 1)}
          className="btn btn-ghost" style={{ fontSize: 12 }}>
          Siguiente →
        </button>
      </div>
    </div>
  )
}
