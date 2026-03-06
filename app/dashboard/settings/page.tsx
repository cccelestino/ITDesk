'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Save, User, Phone, Building } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ full_name:'', display_name:'', job_title:'', ext_number:'' })
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({...p, [k]: e.target.value}))

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('*').eq('id', user.id).single()
        .then(({ data }) => data && setForm({
          full_name:    data.full_name    || '',
          display_name: data.display_name || '',
          job_title:    data.job_title    || '',
          ext_number:   data.ext_number   || '',
        }))
    })
  }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')
      const { error } = await supabase.from('profiles').update(form).eq('id', user.id)
      if (error) throw error
      toast.success('Perfil actualizado')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto anim-fade">
      <div className="mb-5">
        <h1 className="font-display font-bold text-xl text-white">Configuración</h1>
        <p className="text-[12.5px] mt-0.5" style={{ color: '#4a5f76' }}>Gestiona tu perfil de usuario</p>
      </div>

      <form onSubmit={save} className="panel p-6 space-y-5">
        <div className="label-caps mb-1 flex items-center gap-1.5"><User size={10} /> Información personal</div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-caps block mb-1.5">Nombre completo</label>
            <input type="text" value={form.full_name} onChange={set('full_name')} className="field" placeholder="Juan Pérez" />
          </div>
          <div>
            <label className="label-caps block mb-1.5">Alias / Username</label>
            <input type="text" value={form.display_name} onChange={set('display_name')} className="field" placeholder="jperez" />
          </div>
        </div>

        <div className="divider" />
        <div className="label-caps mb-1 flex items-center gap-1.5"><Building size={10} /> Datos laborales</div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-caps block mb-1.5 flex items-center gap-1"><Building size={9} /> Cargo</label>
            <input type="text" value={form.job_title} onChange={set('job_title')} className="field" placeholder="Analista IT" />
          </div>
          <div>
            <label className="label-caps block mb-1.5 flex items-center gap-1"><Phone size={9} /> Extensión</label>
            <input type="text" value={form.ext_number} onChange={set('ext_number')} className="field" placeholder="1234" />
          </div>
        </div>

        <div className="divider" />

        <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Guardar cambios
        </button>
      </form>
    </div>
  )
}
