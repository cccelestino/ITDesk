'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Ticket, Users, BarChart2,
  Settings, LogOut, Cpu, ChevronRight, Bell,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types'
import clsx from 'clsx'

const nav = [
  { href: '/dashboard',          label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/dashboard/tickets',  label: 'Tickets',      icon: Ticket },
  { href: '/dashboard/agents',   label: 'Agentes',      icon: Users,    agentOnly: true },
  { href: '/dashboard/analytics',label: 'Analytics',    icon: BarChart2, agentOnly: true },
  { href: '/dashboard/settings', label: 'Configuración',icon: Settings },
]

export default function Sidebar({ profile }: { profile: Profile | null }) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()
  const isAgent  = profile?.role === 'agent' || profile?.role === 'admin'

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
    router.refresh()
  }

  const initials = (profile?.full_name || profile?.email || 'U')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <aside
      className="w-[220px] shrink-0 flex flex-col"
      style={{ background: 'var(--ink-900)', borderRight: '1px solid var(--wire)' }}
    >
      {/* Logo */}
      <div
        className="h-14 flex items-center gap-2.5 px-4"
        style={{ borderBottom: '1px solid var(--wire)' }}
      >
        <div
          className="w-7 h-7 rounded flex items-center justify-center shrink-0"
          style={{ background: 'var(--steel-dim)', border: '1px solid var(--steel-b)' }}
        >
          <Cpu size={14} style={{ color: 'var(--steel)' }} />
        </div>
        <div>
          <div className="font-display font-bold text-[13px] text-white leading-none">ITDesk</div>
          <div className="label-caps" style={{ marginTop: 2, fontSize: 9 }}>Soporte IT interno</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2.5 space-y-0.5 overflow-y-auto">
        {nav
          .filter(item => !item.agentOnly || isAgent)
          .map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            return (
              <Link key={href} href={href} className={clsx('nav-item', active && 'active')}>
                <Icon size={15} className="nav-icon" />
                <span className="flex-1 text-[13px]">{label}</span>
                {active && <ChevronRight size={11} style={{ color: 'var(--steel)', opacity: 0.6 }} />}
              </Link>
            )
          })}
      </nav>

      {/* Bottom */}
      <div className="p-2.5 space-y-0.5" style={{ borderTop: '1px solid var(--wire)' }}>
        <button onClick={signOut} className="nav-item w-full" style={{ textAlign: 'left' }}>
          <LogOut size={14} className="nav-icon" />
          <span className="text-[13px]">Cerrar sesión</span>
        </button>

        {/* User pill */}
        <div
          className="mt-1.5 flex items-center gap-2.5 p-2.5 rounded-md"
          style={{ background: 'var(--ink-800)', border: '1px solid var(--wire)' }}
        >
          <div
            className="w-7 h-7 rounded flex items-center justify-center shrink-0 font-mono text-[10px] font-bold"
            style={{ background: 'var(--steel-dim)', color: 'var(--steel)' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold text-white truncate leading-none">
              {profile?.display_name || profile?.full_name || 'Usuario'}
            </div>
            <div className="label-caps mt-0.5" style={{ fontSize: 9 }}>
              {profile?.role === 'admin' ? 'Administrador' : profile?.role === 'agent' ? 'Agente IT' : 'Empleado'}
            </div>
          </div>
          <Bell size={13} style={{ color: '#3d4e62', flexShrink: 0 }} />
        </div>
      </div>
    </aside>
  )
}
