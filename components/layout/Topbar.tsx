'use client'
import { Search, Plus } from 'lucide-react'
import Link from 'next/link'
import { Profile } from '@/types'

export default function Topbar({ profile }: { profile: Profile | null }) {
  const now = new Date()
  const timeStr = now.toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' })
  const dateStr = now.toLocaleDateString('es-MX', { weekday:'short', day:'numeric', month:'short' })

  return (
    <header
      className="h-14 flex items-center gap-4 px-5 shrink-0"
      style={{ borderBottom: '1px solid var(--wire)', background: 'var(--ink-900)' }}
    >
      {/* Search */}
      <div className="relative flex-1 max-w-xs">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#3d4e62' }} />
        <input
          type="search"
          placeholder="Buscar ticket, #número, usuario..."
          className="field"
          style={{ paddingLeft: '32px', paddingTop: '7px', paddingBottom: '7px', fontSize: '12.5px' }}
        />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Clock — gives an ops center feel */}
      <div className="hidden md:flex flex-col items-end leading-none" style={{ color: '#3d4e62' }}>
        <span className="mono text-[13px]" style={{ color: '#5a6f88' }}>{timeStr}</span>
        <span className="label-caps" style={{ marginTop: 2, fontSize: 9 }}>{dateStr}</span>
      </div>

      <div className="w-px h-5" style={{ background: 'var(--wire)' }} />

      {/* New ticket CTA */}
      <Link href="/dashboard/tickets/new" className="btn btn-primary" style={{ padding: '7px 13px', fontSize: '12.5px', gap: '5px' }}>
        <Plus size={13} />
        Nuevo ticket
      </Link>
    </header>
  )
}
