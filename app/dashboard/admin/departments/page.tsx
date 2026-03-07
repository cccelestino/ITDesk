'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Building2, Plus, Pencil, Trash2, Loader2, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface Dept {
  id: string; name: string; code: string; color: string
  created_at: string; _count?: number
}

const COLORS = ['#3d8ef0','#8b5cf6','#22c55e','#f97316','#ef4444','#eab308','#ec4899','#06b6d4']

export default function DepartmentsPage() {
  const supabase = createClient()
  const [depts, setDepts]       = useState<Dept[]>([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [editId, setEditId]     = useState<string | null>(null)
  const [showNew, setShowNew]   = useState(false)
  const [form, setForm]         = useState({ name: '', code: '', color: COLORS[0] })
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  const load = useCallback(async () => {
    setLoading(true)
    const { data: d } = await supabase.from('departments').select('*').order('name')
    const { data: counts } = await supabase.from('profiles').select('department_id')
    const countMap: Record<string, number> = {}
    counts?.forEach((p: any) => { if (p.department_id) countMap[p.department_id] = (countMap[p.department_id] || 0) + 1 })
    setDepts((d || []).map((dep: Dept) => ({ ...dep, _count: countMap[dep.id] || 0 })))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const save = async () => {
    if (!form.name || !form.code) { toast.error('Nombre y código son requeridos'); return }
    setSaving(true)
    if (editId) {
      const { error } = await supabase.from('departments').update({
        name: form.name, code: form.code.toUpperCase(), color: form.color,
      }).eq('id', editId)
      if (error) { toast.error(error.message); setSaving(false); return }
      toast.success('Departamento actualizado')
      setEditId(null)
    } else {
      const { error } = await supabase.from('departments').insert({
        name: form.name, code: form.code.toUpperCase(), color: form.color,
      })
      if (error) { toast.error(error.message); setSaving(false); return }
      toast.success('Departamento creado')
      setShowNew(false)
    }
    setForm({ name: '', code: '', color: COLORS[0] })
    setSaving(false)
    load()
  }

  const startEdit = (d: Dept) => {
    setEditId(d.id)
    setForm({ name: d.name, code: d.code, color: d.color })
    setShowNew(false)
  }

  const del = async (id: string) => {
    if (!confirm('¿Eliminar departamento? Los usuarios quedarán sin departamento.')) return
    const { error } = await supabase.from('departments').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('Departamento eliminado')
    load()
  }

  const FormRow = () => (
    <div className="grid grid-cols-12 gap-3 p-4 anim-up"
      style={{ background: 'rgba(61,142,240,.05)', borderBottom: '1px solid var(--wire)' }}>
      <div className="col-span-5">
        <label className="label-caps block mb-1">Nombre</label>
        <input type="text" placeholder="Tecnología" value={form.name} onChange={set('name')} className="field" />
      </div>
      <div className="col-span-2">
        <label className="label-caps block mb-1">Código</label>
        <input type="text" placeholder="IT" maxLength={5}
          value={form.code}
          onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
          className="field mono" />
      </div>
      <div className="col-span-3">
        <label className="label-caps block mb-1">Color</label>
        <div className="flex gap-1.5 flex-wrap mt-1">
          {COLORS.map(c => (
            <button key={c} onClick={() => setForm(p => ({ ...p, color: c }))}
              className="w-5 h-5 rounded-full transition-all"
              style={{
                background: c,
                outline: form.color === c ? `2px solid ${c}` : 'none',
                outlineOffset: 2,
                transform: form.color === c ? 'scale(1.2)' : 'scale(1)',
              }} />
          ))}
        </div>
      </div>
      <div className="col-span-2 flex items-end gap-1.5">
        <button onClick={save} disabled={saving} className="btn btn-success flex-1 justify-center" style={{ padding: '8px 8px', fontSize: 11 }}>
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          {editId ? 'Guardar' : 'Crear'}
        </button>
        <button onClick={() => { setEditId(null); setShowNew(false); setForm({ name:'', code:'', color: COLORS[0] }) }}
          className="btn btn-ghost" style={{ padding: '8px 9px' }}>
          <X size={12} />
        </button>
      </div>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto space-y-5 anim-fade">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-xl text-white flex items-center gap-2">
            <Building2 size={20} style={{ color: 'var(--steel)' }} />
            Departamentos
          </h1>
          <p className="text-[12.5px] mt-0.5" style={{ color: '#4a5f76' }}>
            {depts.length} departamentos configurados
          </p>
        </div>
        <button onClick={() => { setShowNew(true); setEditId(null) }} className="btn btn-primary">
          <Plus size={13} /> Nuevo departamento
        </button>
      </div>

      <div className="panel overflow-hidden">
        {showNew && !editId && <FormRow />}

        {loading ? (
          <div className="p-10 text-center"><Loader2 size={20} className="animate-spin mx-auto" style={{ color: '#3d4e62' }} /></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Departamento</th>
                <th>Código</th>
                <th>Usuarios</th>
                <th>Color</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {depts.map(dept => (
                <>
                  <tr key={dept.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: dept.color }} />
                        <span className="text-[13px] font-medium text-white">{dept.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className="mono text-[11px] px-2 py-0.5 rounded"
                        style={{ background: dept.color + '18', color: dept.color }}>
                        {dept.code}
                      </span>
                    </td>
                    <td className="mono text-[12px]" style={{ color: '#7a8fa8' }}>{dept._count}</td>
                    <td>
                      <div className="w-5 h-5 rounded-full" style={{ background: dept.color }} />
                    </td>
                    <td>
                      <div className="flex gap-1.5">
                        <button onClick={() => startEdit(dept)}
                          className="btn btn-ghost" style={{ padding: '4px 9px', fontSize: 11 }}>
                          <Pencil size={11} /> Editar
                        </button>
                        <button onClick={() => del(dept.id)}
                          className="btn btn-danger" style={{ padding: '4px 9px', fontSize: 11 }}>
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editId === dept.id && (
                    <tr key={`edit-${dept.id}`}>
                      <td colSpan={5} style={{ padding: 0 }}><FormRow /></td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
