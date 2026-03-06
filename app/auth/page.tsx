'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Loader2, Terminal, Shield, Cpu } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AuthPage() {
  const router = useRouter()
  const supabase = createClient()
  const [mode, setMode]       = useState<'login'|'signup'>('login')
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw]   = useState(false)
  const [form, setForm]       = useState({ email:'', password:'', name:'' })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email, password: form.password,
        })
        if (error) throw error
        router.push('/dashboard')
        router.refresh()
      } else {
        const { error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: { full_name: form.name },
            emailRedirectTo: `${location.origin}/auth/callback`,
          },
        })
        if (error) throw error
        toast.success('Revisa tu email para confirmar el registro.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Error de autenticación')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex"
      style={{ background: 'var(--ink-950)' }}
    >
      {/* ── Left panel (branding) ── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 p-10 border-r"
        style={{ borderColor: 'var(--wire)', background: 'var(--ink-900)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--steel-dim)', border: '1px solid var(--steel-b)' }}
          >
            <Cpu size={18} style={{ color: 'var(--steel)' }} />
          </div>
          <div>
            <div className="font-display font-bold text-[15px] text-white tracking-tight">ITDesk</div>
            <div className="label-caps" style={{ marginTop: 1 }}>Sistema de soporte interno</div>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-6">
          {[
            { icon: Terminal, title: 'Panel de operaciones',
              desc: 'Gestiona todos los tickets de IT en tiempo real desde un único dashboard.' },
            { icon: Shield,   title: 'Roles y permisos',
              desc: 'Empleados, agentes y administradores con acceso diferenciado.' },
            { icon: Cpu,      title: 'SLA automático',
              desc: 'Seguimiento de tiempos de respuesta y resolución por prioridad.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex gap-4">
              <div
                className="w-8 h-8 rounded flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: 'var(--ink-800)', border: '1px solid var(--wire)' }}
              >
                <Icon size={15} style={{ color: 'var(--steel)' }} />
              </div>
              <div>
                <div className="text-[13px] font-semibold text-white mb-0.5">{title}</div>
                <div className="text-[12px] leading-relaxed" style={{ color: '#4a5f76' }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="label-caps">© {new Date().getFullYear()} ITDesk · v1.0</div>
      </div>

      {/* ── Right panel (form) ── */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm anim-up">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <Cpu size={20} style={{ color: 'var(--steel)' }} />
            <span className="font-display font-bold text-white">ITDesk</span>
          </div>

          <h1 className="font-display font-bold text-[22px] text-white mb-1">
            {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </h1>
          <p className="text-[13px] mb-7" style={{ color: '#4a5f76' }}>
            {mode === 'login'
              ? 'Accede con tus credenciales corporativas'
              : 'Regístrate con tu email de empresa'}
          </p>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="label-caps block mb-1.5">Nombre completo</label>
                <input
                  type="text" required
                  placeholder="Ej. Juan Pérez"
                  value={form.name}
                  onChange={set('name')}
                  className="field"
                />
              </div>
            )}

            <div>
              <label className="label-caps block mb-1.5">Email corporativo</label>
              <input
                type="email" required
                placeholder="usuario@empresa.com"
                value={form.email}
                onChange={set('email')}
                className="field"
                autoComplete="email"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label-caps">Contraseña</label>
                {mode === 'login' && (
                  <a href="/auth/reset" className="text-[11px]" style={{ color: 'var(--steel)' }}>
                    ¿Olvidaste tu contraseña?
                  </a>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  required minLength={8}
                  placeholder="Mínimo 8 caracteres"
                  value={form.password}
                  onChange={set('password')}
                  className="field"
                  style={{ paddingRight: '40px' }}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: '#3d4e62' }}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center" style={{ padding: '10px 16px' }}>
              {loading
                ? <Loader2 size={15} className="animate-spin" />
                : mode === 'login' ? 'Ingresar al sistema' : 'Crear cuenta'}
            </button>
          </form>

          <div className="divider my-5" />

          <p className="text-center text-[13px]" style={{ color: '#4a5f76' }}>
            {mode === 'login' ? '¿Nuevo usuario?' : '¿Ya tienes cuenta?'}{' '}
            <button
              onClick={() => setMode(m => m === 'login' ? 'signup' : 'login')}
              className="font-medium"
              style={{ color: 'var(--steel)' }}
            >
              {mode === 'login' ? 'Crear cuenta' : 'Iniciar sesión'}
            </button>
          </p>

          {/* Admin hint */}
          <div
            className="mt-6 p-3 rounded-md text-[11px]"
            style={{ background: 'var(--ink-800)', border: '1px solid var(--wire)', color: '#3d4e62', lineHeight: 1.5 }}
          >
            <span style={{ color: '#4a5f76', fontWeight: 600 }}>Admin:</span> Después de registrarte, pide a un administrador que cambie tu rol en Supabase.
          </div>
        </div>
      </div>
    </div>
  )
}
