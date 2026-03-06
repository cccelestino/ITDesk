'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TicketCategory, TicketPriority, CATEGORY_MAP, PRIORITY_MAP } from '@/types'
import { ArrowLeft, Send, Loader2, Monitor, MapPin } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

const priorities: TicketPriority[] = ['low', 'medium', 'high', 'critical']
const categories: TicketCategory[] = ['hardware','software','network','access','email','printer','security','other']

export default function NewTicketPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'software' as TicketCategory,
    priority: 'medium' as TicketPriority,
    device_info: '',
    location: '',
  })
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      const { data, error } = await supabase.from('tickets').insert({
        title:       form.title,
        description: form.description,
        category:    form.category,
        priority:    form.priority,
        device_info: form.device_info || null,
        location:    form.location || null,
        created_by:  user.id,
        status:      'open',
      }).select().single()

      if (error) throw error
      toast.success(`Ticket #${data.ticket_number} creado`)
      router.push(`/dashboard/tickets/${data.id}`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const prCfg = PRIORITY_MAP[form.priority]

  return (
    <div className="max-w-2xl mx-auto anim-up">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link href="/dashboard/tickets" className="btn btn-ghost" style={{ padding: '6px 11px', fontSize: 12 }}>
          <ArrowLeft size={13} /> Volver
        </Link>
        <div>
          <h1 className="font-display font-bold text-lg text-white">Nuevo ticket de soporte</h1>
          <p className="text-[12px]" style={{ color: '#4a5f76' }}>
            Completa los datos para que el equipo IT pueda atenderte
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4">
        {/* Main panel */}
        <div className="panel p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="label-caps block mb-1.5">Título del problema <span style={{ color: '#ef4444' }}>*</span></label>
            <input
              type="text"
              placeholder="Ej: No puedo conectarme a la VPN desde casa"
              value={form.title}
              onChange={set('title')}
              required
              maxLength={200}
              className="field"
            />
          </div>

          {/* Category + Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-caps block mb-1.5">Categoría</label>
              <select value={form.category} onChange={set('category')} className="field">
                {categories.map(c => (
                  <option key={c} value={c}>
                    {CATEGORY_MAP[c].icon} {CATEGORY_MAP[c].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-caps block mb-1.5">Urgencia</label>
              <div className="grid grid-cols-2 gap-1.5">
                {priorities.map(p => {
                  const cfg = PRIORITY_MAP[p]
                  const active = form.priority === p
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, priority: p }))}
                      className="pill justify-center"
                      style={{
                        padding: '7px 4px',
                        background: active ? cfg.bg : 'var(--ink-700)',
                        color: active ? cfg.color : '#4a5f76',
                        border: `1px solid ${active ? cfg.color + '40' : 'var(--wire)'}`,
                        cursor: 'pointer',
                        transition: 'all .14s',
                      }}
                    >
                      {cfg.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="label-caps block mb-1.5">
              Descripción detallada <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              placeholder={`Describe el problema con el mayor detalle posible:
- ¿Cuándo empezó?
- ¿Qué intentaste hacer?
- ¿Hay mensajes de error?
- ¿El problema es constante o intermitente?`}
              value={form.description}
              onChange={set('description')}
              required
              rows={7}
              className="field"
            />
          </div>
        </div>

        {/* Device info */}
        <div className="panel p-5">
          <div className="label-caps mb-3" style={{ color: '#4a5f76' }}>Información del equipo (opcional)</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-caps block mb-1.5 flex items-center gap-1.5">
                <Monitor size={11} /> Hostname / Asset tag
              </label>
              <input
                type="text"
                placeholder="Ej: PC-JPEREZ-01 o IT-2045"
                value={form.device_info}
                onChange={set('device_info')}
                className="field"
              />
            </div>
            <div>
              <label className="label-caps block mb-1.5 flex items-center gap-1.5">
                <MapPin size={11} /> Ubicación / Piso
              </label>
              <input
                type="text"
                placeholder="Ej: Piso 3, sala de juntas"
                value={form.location}
                onChange={set('location')}
                className="field"
              />
            </div>
          </div>
        </div>

        {/* SLA notice */}
        <div
          className="flex items-start gap-3 p-3 rounded-md text-[12px]"
          style={{ background: 'var(--ink-800)', border: `1px solid ${prCfg.color}20` }}
        >
          <div
            className="w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: prCfg.bg }}
          >
            <span style={{ fontSize: 10 }}>⏱</span>
          </div>
          <div style={{ color: '#4a5f76' }}>
            Con prioridad <strong style={{ color: prCfg.color }}>{prCfg.label}</strong>, el SLA garantiza respuesta en{' '}
            <strong style={{ color: '#7a8fa8' }}>
              {form.priority === 'critical' ? '1 hora' : form.priority === 'high' ? '4 horas' : form.priority === 'medium' ? '8 horas' : '24 horas'}
            </strong>.
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-1">
          <Link href="/dashboard/tickets" className="btn btn-ghost">Cancelar</Link>
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: '9px 18px' }}>
            {loading
              ? <><Loader2 size={14} className="animate-spin" /> Enviando...</>
              : <><Send size={14} /> Enviar solicitud</>}
          </button>
        </div>
      </form>
    </div>
  )
}
