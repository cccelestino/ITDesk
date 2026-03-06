'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Send, Loader2, Lock, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface Comment {
  id: string; content: string; is_internal: boolean; created_at: string
  author: { full_name: string|null; display_name: string|null; email: string; role: string }|null
}

export default function CommentThread({
  ticketId, comments, currentUserId, isAgent,
}: {
  ticketId: string; comments: Comment[]; currentUserId: string; isAgent: boolean
}) {
  const [content, setContent]       = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [loading, setLoading]       = useState(false)
  const supabase = createClient()
  const router   = useRouter()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    setLoading(true)
    try {
      const { error } = await supabase.from('ticket_comments').insert({
        ticket_id: ticketId,
        author_id: currentUserId,
        content: content.trim(),
        is_internal: isAgent && isInternal,
      })
      if (error) throw error
      setContent('')
      router.refresh()
      toast.success('Respuesta agregada')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Thread */}
      <div className="panel overflow-hidden">
        <div className="panel-header">
          <span className="text-[12.5px] font-semibold text-white flex items-center gap-2">
            <MessageSquare size={13} style={{ color: '#3d4e62' }} />
            Conversación
            <span
              className="mono text-[10px] px-1.5 py-0.5 rounded"
              style={{ background: 'var(--ink-700)', color: '#4a5f76' }}
            >
              {comments.filter(c => !c.is_internal).length}
            </span>
          </span>
        </div>

        {!comments.length ? (
          <div className="p-8 text-center" style={{ color: '#3d4e62', fontSize: 12 }}>
            Sin respuestas aún
          </div>
        ) : (
          <div>
            {comments.map((c, i) => {
              const name = c.author?.display_name || c.author?.full_name || c.author?.email || 'Usuario'
              const initial = name[0].toUpperCase()
              const isStaff = c.author?.role === 'agent' || c.author?.role === 'admin'
              return (
                <div
                  key={c.id}
                  style={{
                    padding: '14px 16px',
                    borderBottom: i < comments.length - 1 ? '1px solid #12151a' : 'none',
                    background: c.is_internal ? 'rgba(234,179,8,.04)' : 'transparent',
                    borderLeft: c.is_internal ? '2px solid rgba(234,179,8,.3)' : '2px solid transparent',
                  }}
                >
                  <div className="flex items-center gap-2.5 mb-2.5">
                    {/* Avatar */}
                    <div
                      className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold shrink-0"
                      style={{
                        background: isStaff ? 'var(--steel-dim)' : 'var(--ink-700)',
                        color: isStaff ? 'var(--steel)' : '#4a5f76',
                      }}
                    >
                      {initial}
                    </div>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-[12.5px] font-semibold text-white truncate">{name}</span>
                      {isStaff && (
                        <span
                          className="pill"
                          style={{ background: 'var(--steel-dim)', color: 'var(--steel)', borderColor: 'var(--steel-b)', padding: '1px 7px', fontSize: 10 }}
                        >
                          Agente IT
                        </span>
                      )}
                      {c.is_internal && (
                        <span
                          className="pill flex items-center gap-1"
                          style={{ background:'rgba(234,179,8,.1)', color:'#eab308', borderColor:'rgba(234,179,8,.2)', padding:'1px 7px', fontSize:10 }}
                        >
                          <Lock size={8} /> Interno
                        </span>
                      )}
                    </div>
                    <span className="text-[10.5px] shrink-0" style={{ color: '#3d4e62' }}>
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: es })}
                    </span>
                  </div>
                  <p
                    className="text-[13px] leading-relaxed whitespace-pre-wrap"
                    style={{ color: '#8fa3be', paddingLeft: '30px' }}
                  >
                    {c.content}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Reply box */}
      <div className="panel p-4">
        <div className="label-caps mb-3">Agregar respuesta</div>
        <form onSubmit={submit} className="space-y-3">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={isAgent ? 'Escribe tu respuesta al usuario...' : 'Agrega información adicional...'}
            rows={4}
            className="field"
          />
          <div className="flex items-center justify-between">
            {isAgent && (
              <label
                className="flex items-center gap-2 cursor-pointer text-[12px] select-none"
                style={{ color: isInternal ? '#eab308' : '#4a5f76' }}
              >
                <input
                  type="checkbox"
                  checked={isInternal}
                  onChange={e => setIsInternal(e.target.checked)}
                  className="accent-yellow-500"
                />
                <Lock size={11} />
                Nota interna (solo agentes)
              </label>
            )}
            <div className="ml-auto">
              <button
                type="submit"
                disabled={loading || !content.trim()}
                className="btn btn-primary"
                style={{ padding: '7px 14px', fontSize: 12.5 }}
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                Enviar
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
