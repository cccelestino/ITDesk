export type TicketStatus   = 'open'|'in_progress'|'pending'|'resolved'|'closed'
export type TicketPriority = 'low'|'medium'|'high'|'critical'
export type TicketCategory = 'hardware'|'software'|'network'|'access'|'email'|'printer'|'security'|'other'
export type UserRole       = 'employee'|'agent'|'admin'

export interface Department {
  id: string; name: string; code: string; color: string; created_at: string
}

export interface Profile {
  id: string; email: string; full_name: string|null; display_name: string|null
  avatar_url: string|null; role: UserRole; department_id: string|null
  job_title: string|null; ext_number: string|null; is_active: boolean
  created_at: string; updated_at: string
  department?: Department
}

export interface Ticket {
  id: string; ticket_number: number; title: string; description: string
  status: TicketStatus; priority: TicketPriority; category: TicketCategory
  created_by: string; assigned_to: string|null; department_id: string|null
  sla_response: number; sla_resolution: number; sla_breached: boolean
  first_response_at: string|null; resolved_at: string|null
  closed_at: string|null; due_at: string|null
  tags: string[]; device_info: string|null; location: string|null
  attachments: { name: string; url: string; size: number }[]
  created_at: string; updated_at: string
  // joins
  created_by_profile?: Profile
  assigned_to_profile?: Profile
  department?: Department
}

export interface TicketComment {
  id: string; ticket_id: string; author_id: string; content: string
  is_internal: boolean; created_at: string
  author?: Profile
}

export interface TicketHistory {
  id: string; ticket_id: string; actor_id: string; action: string
  old_val: string|null; new_val: string|null; created_at: string
  actor?: Profile
}

export interface Notification {
  id: string; user_id: string; ticket_id: string|null; kind: string
  title: string; body: string; is_read: boolean; created_at: string
}

// ── Config maps ──────────────────────────────────────────
export const STATUS_MAP: Record<TicketStatus, {
  label: string; color: string; bg: string; border: string; dot: string
}> = {
  open:        { label:'Abierto',      color:'#3d8ef0', bg:'rgba(61,142,240,.1)',  border:'rgba(61,142,240,.22)',  dot:'#3d8ef0' },
  in_progress: { label:'En progreso',  color:'#8b5cf6', bg:'rgba(139,92,246,.1)', border:'rgba(139,92,246,.22)', dot:'#8b5cf6' },
  pending:     { label:'Pendiente',    color:'#eab308', bg:'rgba(234,179,8,.1)',   border:'rgba(234,179,8,.22)',   dot:'#eab308' },
  resolved:    { label:'Resuelto',     color:'#22c55e', bg:'rgba(34,197,94,.1)',   border:'rgba(34,197,94,.22)',   dot:'#22c55e' },
  closed:      { label:'Cerrado',      color:'#4a5568', bg:'rgba(74,85,104,.1)',   border:'rgba(74,85,104,.22)',   dot:'#4a5568' },
}

export const PRIORITY_MAP: Record<TicketPriority, {
  label: string; color: string; bg: string
}> = {
  low:      { label:'Baja',     color:'#4a5568', bg:'rgba(74,85,104,.1)'   },
  medium:   { label:'Media',    color:'#eab308', bg:'rgba(234,179,8,.1)'   },
  high:     { label:'Alta',     color:'#f97316', bg:'rgba(249,115,22,.1)'  },
  critical: { label:'Crítica',  color:'#ef4444', bg:'rgba(239,68,68,.1)'   },
}

export const CATEGORY_MAP: Record<TicketCategory, { label: string; icon: string }> = {
  hardware: { label:'Hardware',       icon:'💻' },
  software: { label:'Software',       icon:'⚙️' },
  network:  { label:'Red/Conectividad',icon:'🌐' },
  access:   { label:'Accesos/Permisos',icon:'🔑' },
  email:    { label:'Email/Correo',    icon:'📧' },
  printer:  { label:'Impresoras',      icon:'🖨️' },
  security: { label:'Seguridad',       icon:'🛡️' },
  other:    { label:'Otro',            icon:'📋' },
}
