'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  UserCog, Plus, Search, Shield, UserCheck, UserX,
  ChevronDown, Loader2, Mail, RefreshCw, Copy, Check,
} from 'lucide-react'
import toast from 'react-hot-toast'

type Role = 'employee' | 'agent' | 'admin'
interface User {
  id: string; email: string; full_name: string | null; display_name: string | null
  role: Role; is_active: boolean; job_title: string | null
  department: { name: string; color: string } | null
  created_at: string
}
interface Dept { id: string; name: string; code: string; color: string }

const ROLE_CFG: Record<Role, { label: string; color: string; bg: string }> = {
  employee: { label: 'Empleado',       color: '#7a8fa8', bg: 'rgba(122,143,168,.1)' },
  agent:    { label: 'Agente IT',      color: '#3d8ef0', bg: 'rgba(61,142,240,.1)'  },
  admin:    { label: 'Administrador',  color: '#ef4444', bg: 'rgba(239,68,68,.1)'   },
}

export default function AdminUsersPage() {
  const supabase = createClient()
  const [users, setUsers]         = useState<User[]>([])
  const [depts, setDepts]         = useState<Dept[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving]       = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied]       = useState(false)
  const [newUser, setNewUser]     = useState({
    email: '', full_name: '', role: 'employee' as Role, department_id: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name, display_name, role, is_active, job_title, created_at, department:departments(name,color)')
      .order('created_at', { ascending: false })
    setUsers((data as User[]) || [])
    const { data: d } = await supabase.from('departments').select('id,name,code,color').order('name')
    setDepts(d || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const changeRole = async (userId: string, role: Role) => {
    setSaving(userId)
    const { error } = await supabase.from('profiles').update({ role }).eq('id', userId)
    if (error) { toast.error(error.message); setSaving(null); return }
    // Log activity
    await supabase.from('activity_log').insert({
      action: 'user.role_changed',
      target_type: 'user', target_id: userId,
      meta: { new_role: role },
    })
    toast.success('Rol actualizado')
    setUsers(u => u.map(x => x.id === userId ? { ...x, role } : x))
    setSaving(null)
  }

  const toggleActive = async (userId: string, current: boolean) => {
    setSaving(userId)
    const { error } = await supabase.from('profiles').update({ is_active: !current }).eq('id', userId)
    if (error) { toast.error(error.message); setSaving(null); return }
    await supabase.from('activity_log').insert({
      action: current ? 'user.deactivated' : 'user.activated',
      target_type: 'user', target_id: userId, meta: {},
    })
    toast.success(current ? 'Usuario desactivado' : 'Usuario activado')
    setUsers(u => u.map(x => x.id === userId ? { ...x, is_active: !current } : x))
    setSaving(null)
  }

  const createInvite = async () => {
    if (!newUser.email) { toast.error('Email requerido'); return }
    setSaving('create')
    // Get current admin id
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase
      .from('invite_tokens')
      .insert({
        email: newUser.email,
        role: newUser.role,
        department_id: newUser.department_id || null,
        created_by: user.id,
      })
      .select()
      .single()
    if (error) { toast.error(error.message); setSaving(null); return }
    const link = `${window.location.origin}/auth?invite=${data.token}&email=${encodeURIComponent(newUser.email)}`
    setInviteLink(link)
    toast.success('Invitación creada')
    setSaving(null)
  }

  const copyLink = async () => {
    if (!inviteLink) return
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const filtered = users.filter(u =>
    !search ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.full_name || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-6xl mx-auto space-y-5 anim-fade">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-xl text-white flex items-center gap-2">
            <UserCog size={20} style={{ color: 'var(--steel)' }} />
            Gestión de usuarios
          </h1>
          <p className="text-[12.5px] mt-0.5" style={{ color: '#4a5f76' }}>
            {users.length} usuarios registrados · {users.filter(u => u.is_active).length} activos
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn btn-ghost" style={{ padding: '7px 11px' }}>
            <RefreshCw size={13} />
          </button>
          <button onClick={() => setShowCreate(!showCreate)} className="btn btn-primary">
            <Plus size={13} /> Invitar usuario
          </button>
        </div>
      </div>

      {/* Create invite panel */}
      {showCreate && (
        <div className="panel p-5 anim-up" style={{ borderColor: 'rgba(61,142,240,.25)' }}>
          <h2 className="text-[13px] font-semibold text-white mb-4 flex items-center gap-2">
            <Mail size={13} style={{ color: 'var(--steel)' }} />
            Crear invitación de registro
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="md:col-span-2">
              <label className="label-caps block mb-1.5">Email *</label>
              <input type="email" placeholder="usuario@empresa.com"
                value={newUser.email}
                onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))}
                className="field" />
            </div>
            <div>
              <label className="label-caps block mb-1.5">Nombre completo</label>
              <input type="text" placeholder="Juan Pérez"
                value={newUser.full_name}
                onChange={e => setNewUser(p => ({ ...p, full_name: e.target.value }))}
                className="field" />
            </div>
            <div>
              <label className="label-caps block mb-1.5">Rol inicial</label>
              <select value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value as Role }))} className="field">
                <option value="employee">Empleado</option>
                <option value="agent">Agente IT</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div>
              <label className="label-caps block mb-1.5">Departamento</label>
              <select value={newUser.department_id} onChange={e => setNewUser(p => ({ ...p, department_id: e.target.value }))} className="field">
                <option value="">— Sin asignar —</option>
                {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>

          {inviteLink ? (
            <div className="space-y-3">
              <div className="p-3 rounded-md flex items-center gap-3"
                style={{ background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.2)' }}>
                <p className="flex-1 mono text-[11px] truncate" style={{ color: '#22c55e' }}>{inviteLink}</p>
                <button onClick={copyLink} className="btn btn-success shrink-0" style={{ padding: '5px 10px', fontSize: 11 }}>
                  {copied ? <><Check size={11} /> Copiado</> : <><Copy size={11} /> Copiar</>}
                </button>
              </div>
              <p className="text-[11px]" style={{ color: '#4a5f76' }}>
                Comparte este link con el usuario. Expira en 7 días. El usuario creará su contraseña al registrarse.
              </p>
              <button onClick={() => { setInviteLink(null); setNewUser({ email:'', full_name:'', role:'employee', department_id:'' }) }}
                className="text-[11px]" style={{ color: 'var(--steel)', background:'none', border:'none', cursor:'pointer' }}>
                ← Crear otra invitación
              </button>
            </div>
          ) : (
            <button onClick={createInvite} disabled={saving === 'create' || !newUser.email} className="btn btn-primary">
              {saving === 'create' ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
              Generar link de invitación
            </button>
          )}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#3d4e62' }} />
        <input type="search" placeholder="Buscar por nombre o email..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="field" style={{ paddingLeft: '32px' }} />
      </div>

      {/* Users table */}
      <div className="panel overflow-hidden">
        {loading ? (
          <div className="p-10 text-center"><Loader2 size={20} className="animate-spin mx-auto" style={{ color: '#3d4e62' }} /></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Departamento</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Registrado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(user => {
                const rc = ROLE_CFG[user.role]
                const isSaving = saving === user.id
                return (
                  <tr key={user.id} style={{ opacity: user.is_active ? 1 : 0.5 }}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded flex items-center justify-center text-[10px] font-bold shrink-0"
                          style={{ background: rc.bg, color: rc.color }}>
                          {(user.full_name || user.email)[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="text-[13px] font-medium text-white">
                            {user.full_name || <span style={{ color: '#4a5f76' }}>Sin nombre</span>}
                          </div>
                          <div className="text-[11px]" style={{ color: '#3d4e62' }}>{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {user.department
                        ? <span className="pill text-[10px]" style={{ background: user.department.color + '18', color: user.department.color }}>{user.department.name}</span>
                        : <span style={{ color: '#3d4e62', fontSize: 12 }}>—</span>}
                    </td>
                    <td>
                      {/* Role selector */}
                      <div className="relative inline-block">
                        <select
                          value={user.role}
                          onChange={e => changeRole(user.id, e.target.value as Role)}
                          disabled={isSaving}
                          className="pill appearance-none pr-6 cursor-pointer"
                          style={{
                            background: rc.bg, color: rc.color,
                            border: `1px solid ${rc.color}30`,
                            fontSize: 11, padding: '3px 20px 3px 8px',
                          }}
                        >
                          <option value="employee">Empleado</option>
                          <option value="agent">Agente IT</option>
                          <option value="admin">Administrador</option>
                        </select>
                        {isSaving
                          ? <Loader2 size={10} className="animate-spin absolute right-1.5 top-1/2 -translate-y-1/2" style={{ color: rc.color }} />
                          : <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: rc.color }} />}
                      </div>
                    </td>
                    <td>
                      <span className="pill text-[10px]" style={{
                        background: user.is_active ? 'rgba(34,197,94,.1)' : 'rgba(74,85,104,.1)',
                        color: user.is_active ? '#22c55e' : '#4a5568',
                        borderColor: user.is_active ? 'rgba(34,197,94,.2)' : 'rgba(74,85,104,.2)',
                      }}>
                        {user.is_active ? '● Activo' : '○ Inactivo'}
                      </span>
                    </td>
                    <td className="text-[11.5px]" style={{ color: '#3d4e62' }}>
                      {new Date(user.created_at).toLocaleDateString('es-MX')}
                    </td>
                    <td>
                      <button
                        onClick={() => toggleActive(user.id, user.is_active)}
                        disabled={isSaving}
                        className={`btn ${user.is_active ? 'btn-danger' : 'btn-success'}`}
                        style={{ padding: '4px 10px', fontSize: 11 }}
                      >
                        {isSaving
                          ? <Loader2 size={11} className="animate-spin" />
                          : user.is_active
                            ? <><UserX size={11} /> Desactivar</>
                            : <><UserCheck size={11} /> Activar</>}
                      </button>
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
