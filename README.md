# ITDesk — Sistema de Tickets IT Interno

Sistema de soporte técnico corporativo para equipos de IT, construido con **Next.js 14**, **Supabase** y desplegado en **Vercel**.

> Sin Stripe. Sin OAuth. Solo email + contraseña. Enfocado 100% en operaciones IT internas.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 14 App Router + TypeScript |
| Estilos | Tailwind CSS (diseño industrial/ops) |
| Auth | Supabase Auth — Email + contraseña |
| Base de datos | Supabase PostgreSQL + RLS |
| Deploy | Vercel |

---

## Módulos incluidos

| Módulo | Roles con acceso |
|--------|-----------------|
| Dashboard de tickets | Todos |
| Lista + filtros de tickets | Todos |
| Crear ticket (con categorías IT) | Todos |
| Detalle + comentarios | Todos |
| Notas internas (solo agentes) | Agente, Admin |
| Panel del agente (asignar, cambiar estado) | Agente, Admin |
| Gestión de agentes y empleados | Agente, Admin |
| Analytics IT | Agente, Admin |
| Configuración de perfil | Todos |

---

## Categorías de tickets IT

- 💻 **Hardware** — equipos físicos, periféricos
- ⚙️ **Software** — instalaciones, licencias, errores
- 🌐 **Red/Conectividad** — VPN, WiFi, Internet
- 🔑 **Accesos/Permisos** — cuentas, Active Directory
- 📧 **Email/Correo** — Outlook, correo corporativo
- 🖨️ **Impresoras** — configuración, atasco de papel
- 🛡️ **Seguridad** — incidentes, malware
- 📋 **Otro** — solicitudes generales

---

## SLA por prioridad

| Prioridad | Respuesta | Resolución |
|-----------|-----------|------------|
| 🔴 Crítica | 1 hora | 4 horas |
| 🟠 Alta | 4 horas | 8 horas |
| 🟡 Media | 8 horas | 24 horas |
| ⚪ Baja | 24 horas | 72 horas |

---

## Estructura del proyecto

```
itdesk/
├── app/
│   ├── page.tsx                     # Redirect → /dashboard
│   ├── layout.tsx                   # Root layout + fonts
│   ├── globals.css                  # Design system IT/ops
│   ├── auth/
│   │   ├── page.tsx                 # Login + Registro (email/password)
│   │   └── callback/route.ts        # OAuth callback (email confirm)
│   ├── dashboard/
│   │   ├── layout.tsx               # Sidebar + Topbar
│   │   ├── page.tsx                 # Dashboard con KPIs
│   │   ├── tickets/
│   │   │   ├── page.tsx             # Lista con filtros
│   │   │   ├── new/page.tsx         # Formulario de creación IT
│   │   │   └── [id]/page.tsx        # Detalle + comentarios + historial
│   │   ├── agents/page.tsx          # Panel de agentes (agente+admin)
│   │   ├── analytics/page.tsx       # Métricas del equipo IT
│   │   └── settings/page.tsx        # Perfil de usuario
│   └── api/
│       └── tickets/route.ts         # REST API
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx              # Navegación lateral
│   │   └── Topbar.tsx               # Barra superior + búsqueda
│   └── tickets/
│       ├── CommentThread.tsx        # Hilo de conversación
│       └── AgentPanel.tsx           # Controles del agente
├── lib/supabase/
│   ├── client.ts                    # Cliente browser
│   └── server.ts                    # Cliente server + admin
├── middleware.ts                    # Protección de rutas
├── types/index.ts                   # TypeScript types + config maps
└── supabase/migrations/
    └── 001_schema.sql               # Schema completo
```

---

## Despliegue paso a paso

### 1. Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ve a **SQL Editor** y ejecuta el archivo completo `supabase/migrations/001_schema.sql`
3. En **Authentication → Providers**, asegúrate que **Email** está activado
4. En **Authentication → URL Configuration**, agrega:
   - Site URL: `https://itdesk.tu-empresa.com`
   - Redirect URLs: `https://itdesk.tu-empresa.com/auth/callback`
5. En **Project Settings → API**, copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

### 2. Vercel

1. Sube el proyecto a un repositorio GitHub/GitLab
2. Conecta el repo en [vercel.com](https://vercel.com)
3. Agrega las variables de entorno del `.env.example`
4. Despliega → el sistema estará listo en segundos

### 3. Primer administrador

Después de registrarte en la app, ve a Supabase → **Table Editor → profiles** y cambia tu rol:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'admin@tu-empresa.com';
```

### 4. Desarrollo local

```bash
npm install
cp .env.example .env.local
# Edita .env.local con tus credenciales
npm run dev
# → http://localhost:3000
```

---

## Roles del sistema

| Rol | Descripción |
|-----|------------|
| `employee` | Empleado — crea tickets, ve solo los suyos, puede comentar |
| `agent` | Agente IT — ve todos los tickets, asigna, cambia estado/prioridad, notas internas, analytics |
| `admin` | Administrador — todo lo anterior + ve todos los usuarios |

Para cambiar roles directamente en Supabase:
```sql
-- Hacer agente IT
UPDATE profiles SET role = 'agent' WHERE email = 'tecnico@empresa.com';
-- Hacer admin
UPDATE profiles SET role = 'admin' WHERE email = 'jefe.it@empresa.com';
```

---

## Roadmap sugerido

- [ ] Notificaciones en tiempo real (Supabase Realtime)
- [ ] Adjuntos de archivos (Supabase Storage)
- [ ] Email de notificación automática (Resend)
- [ ] Inventario de activos IT vinculado a tickets
- [ ] Base de conocimiento / FAQs
- [ ] Integración con Active Directory / LDAP
- [ ] Reportes en PDF exportables
- [ ] App móvil (Expo + Supabase)
