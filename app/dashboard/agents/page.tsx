import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Users, CheckCircle, XCircle, Shield } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export default async function AgentsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role === 'employee') redirect('/dashboard')

  const { data: agents } = await supabase
    .from('profiles')
    .select('*, department:departments(name, code, color)')
    .in('role', ['agent', 'admin'])
    .order('created_at', { ascending: false })

  const { data: employees } = await supabase
    .from('profiles')
    .select('*, department:departments(name, code, color)')
    .eq('role', 'employee')
    .order('created_at', { ascending: false })

  // Ticket counts per agent
  const { data: ticketStats } = await supabase
    .from('tickets')
    .select('assigned_to, status')
    .not('assigned_to', 'is', null)

  const countByAgent = (agentId: string) => {
    const all     = ticketStats?.filter(t => t.assigned_to === agentId) || []
    const open    = all.filter(t => ['open','in_progress','pending'].includes(t.status)).length
    const resolved = all.filter(t => t.status === 'resolved').length
    return { open, resolved, total: all.length }
  }

  const isAdmin = me?.role === 'admin'

  return (
    <div className="max-w-7xl mx-auto space-y-6 anim-fade">
      <div>
        <h1 className="font-display font-bold text-xl text-white">Equipo IT</h1>
        <p className="text-[12.5px] mt-0.5" style={{ color: '#4a5f76' }}>
          {agents?.length} agente{agents?.length !== 1 ? 's' : ''} activos
        </p>
      </div>

      {/* Agents table */}
      <div className="panel overflow-hidden">
        <div className="panel-header">
          <span className="text-[13px] font-semibold text-white flex items-center gap-2">
            <Shield size={13} style={{ color: 'var(--steel)' }} />
            Agentes / Administradores
          </span>
          <span className="label-caps">{agents?.length} total</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Agente</th>
              <th>Rol</th>
              <th>Departamento</th>
              <th>Tickets abiertos</th>
              <th>Resueltos</th>
              <th>Estado</th>
              <th>Desde</th>
            </tr>
          </thead>
          <tbody>
            {agents?.map((agent: any) => {
              const stats = countByAgent(agent.id)
              return (
                <tr key={agent.id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded flex items-center justify-center text-[10px] font-bold shrink-0"
                        style={{ background: 'var(--steel-dim)', color: 'var(--steel)' }}
                      >
                        {(agent.full_name || agent.email)[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-[13px] font-medium text-white">{agent.full_name || '—'}</div>
                        <div className="text-[11px]" style={{ color: '#3d4e62' }}>{agent.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span
                      className="pill"
                      style={{
                        background: agent.role === 'admin' ? 'rgba(239,68,68,.1)' : 'var(--steel-dim)',
                        color: agent.role === 'admin' ? '#ef4444' : 'var(--steel)',
                        borderColor: agent.role === 'admin' ? 'rgba(239,68,68,.2)' : 'var(--steel-b)',
                      }}
                    >
                      {agent.role === 'admin' ? 'Admin' : 'Agente IT'}
                    </span>
                  </td>
                  <td>
                    {agent.department ? (
                      <span
                        className="pill"
                        style={{ background: agent.department.color + '15', color: agent.department.color, fontSize: 10 }}
                      >
                        {agent.department.code}
                      </span>
                    ) : <span style={{ color: '#3d4e62', fontSize: 12 }}>—</span>}
                  </td>
                  <td>
                    <span className="mono text-[13px]" style={{ color: stats.open > 5 ? '#f97316' : '#8fa3be' }}>
                      {stats.open}
                    </span>
                  </td>
                  <td>
                    <span className="mono text-[13px]" style={{ color: '#22c55e' }}>{stats.resolved}</span>
                  </td>
                  <td>
                    {agent.is_active
                      ? <span className="flex items-center gap-1.5 text-[12px]" style={{ color: '#22c55e' }}><CheckCircle size={12} /> Activo</span>
                      : <span className="flex items-center gap-1.5 text-[12px]" style={{ color: '#4a5568' }}><XCircle size={12} /> Inactivo</span>}
                  </td>
                  <td className="text-[11.5px]" style={{ color: '#3d4e62' }}>
                    {formatDistanceToNow(new Date(agent.created_at), { addSuffix: true, locale: es })}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Employees table */}
      {isAdmin && (
        <div className="panel overflow-hidden">
          <div className="panel-header">
            <span className="text-[13px] font-semibold text-white flex items-center gap-2">
              <Users size={13} style={{ color: '#4a5f76' }} />
              Empleados registrados
            </span>
            <span className="label-caps">{employees?.length} total</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Empleado</th>
                <th>Departamento</th>
                <th>Ext.</th>
                <th>Estado</th>
                <th>Registrado</th>
              </tr>
            </thead>
            <tbody>
              {employees?.map((emp: any) => (
                <tr key={emp.id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold shrink-0"
                        style={{ background: 'var(--ink-700)', color: '#4a5f76' }}
                      >
                        {(emp.full_name || emp.email)[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-[12.5px] font-medium text-white">{emp.full_name || '—'}</div>
                        <div className="text-[11px]" style={{ color: '#3d4e62' }}>{emp.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {emp.department
                      ? <span className="pill" style={{ background: emp.department.color + '15', color: emp.department.color, fontSize: 10 }}>{emp.department.code}</span>
                      : <span style={{ color: '#3d4e62', fontSize: 12 }}>—</span>}
                  </td>
                  <td className="mono text-[12px]" style={{ color: '#4a5f76' }}>{emp.ext_number || '—'}</td>
                  <td>
                    {emp.is_active
                      ? <span style={{ color: '#22c55e', fontSize: 12 }}>Activo</span>
                      : <span style={{ color: '#4a5568', fontSize: 12 }}>Inactivo</span>}
                  </td>
                  <td className="text-[11.5px]" style={{ color: '#3d4e62' }}>
                    {formatDistanceToNow(new Date(emp.created_at), { addSuffix: true, locale: es })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isAdmin && (
        <div
          className="p-4 rounded-md text-[12px] leading-relaxed"
          style={{ background: 'var(--ink-800)', border: '1px solid var(--wire)', color: '#4a5f76' }}
        >
          <strong style={{ color: '#7a8fa8' }}>Para cambiar roles</strong>, ve a Supabase → Table Editor → profiles y actualiza el campo <code className="mono" style={{ color: 'var(--steel)' }}>role</code> directamente.<br />
          Valores válidos: <code className="mono" style={{ color: 'var(--steel)' }}>employee</code>, <code className="mono" style={{ color: 'var(--steel)' }}>agent</code>, <code className="mono" style={{ color: 'var(--steel)' }}>admin</code>
        </div>
      )}
    </div>
  )
}
