-- ====================================================
-- ITDesk — IT Support Ticket System
-- Supabase Migration 001
-- ====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Enums ──────────────────────────────────────────
CREATE TYPE ticket_status   AS ENUM ('open','in_progress','pending','resolved','closed');
CREATE TYPE ticket_priority AS ENUM ('low','medium','high','critical');
CREATE TYPE ticket_category AS ENUM (
  'hardware','software','network','access','email',
  'printer','security','other'
);
CREATE TYPE user_role AS ENUM ('employee','agent','admin');

-- ── Departments ────────────────────────────────────
CREATE TABLE departments (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  code       TEXT UNIQUE NOT NULL,        -- e.g. "IT", "HR", "FIN"
  color      TEXT DEFAULT '#3d8ef0',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO departments (name, code, color) VALUES
  ('Tecnología',  'IT',  '#3d8ef0'),
  ('Recursos Humanos', 'HR', '#8b5cf6'),
  ('Finanzas',    'FIN', '#22c55e'),
  ('Operaciones', 'OPS', '#f97316'),
  ('Dirección',   'DIR', '#eab308');

-- ── Profiles ───────────────────────────────────────
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  full_name     TEXT,
  display_name  TEXT,               -- short username / alias
  avatar_url    TEXT,
  role          user_role DEFAULT 'employee',
  department_id UUID REFERENCES departments(id),
  job_title     TEXT,
  ext_number    TEXT,               -- internal phone extension
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tickets ────────────────────────────────────────
CREATE TABLE tickets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number   SERIAL UNIQUE,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  status          ticket_status   DEFAULT 'open',
  priority        ticket_priority DEFAULT 'medium',
  category        ticket_category DEFAULT 'other',
  -- References
  created_by      UUID NOT NULL REFERENCES profiles(id),
  assigned_to     UUID REFERENCES profiles(id),
  department_id   UUID REFERENCES departments(id),
  -- SLA (business hours, in minutes)
  sla_response    INT  DEFAULT 240,   -- 4h
  sla_resolution  INT  DEFAULT 1440,  -- 24h
  sla_breached    BOOLEAN DEFAULT false,
  -- Timestamps
  first_response_at TIMESTAMPTZ,
  resolved_at     TIMESTAMPTZ,
  closed_at       TIMESTAMPTZ,
  due_at          TIMESTAMPTZ,
  -- Extra
  tags            TEXT[]   DEFAULT '{}',
  device_info     TEXT,               -- hostname / asset tag
  location        TEXT,               -- office / floor / room
  attachments     JSONB    DEFAULT '[]',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Comments ───────────────────────────────────────
CREATE TABLE ticket_comments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id   UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES profiles(id),
  content     TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,   -- agent-only note
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Audit log ──────────────────────────────────────
CREATE TABLE ticket_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id   UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  actor_id    UUID NOT NULL REFERENCES profiles(id),
  action      TEXT NOT NULL,   -- e.g. "status_changed", "assigned"
  old_val     TEXT,
  new_val     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Notifications ──────────────────────────────────
CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ticket_id  UUID REFERENCES tickets(id) ON DELETE SET NULL,
  kind       TEXT DEFAULT 'info',   -- info | warning | success | error
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  is_read    BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ────────────────────────────────────────
CREATE INDEX idx_tickets_status      ON tickets(status);
CREATE INDEX idx_tickets_assigned    ON tickets(assigned_to);
CREATE INDEX idx_tickets_created_by  ON tickets(created_by);
CREATE INDEX idx_tickets_created_at  ON tickets(created_at DESC);
CREATE INDEX idx_tickets_priority    ON tickets(priority);
CREATE INDEX idx_comments_ticket     ON ticket_comments(ticket_id);
CREATE INDEX idx_notif_user_unread   ON notifications(user_id, is_read);

-- ── updated_at trigger ─────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_profiles_upd BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_tickets_upd  BEFORE UPDATE ON tickets  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Auto-create profile ────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    split_part(NEW.email,'@',1)
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── Audit log trigger ──────────────────────────────
CREATE OR REPLACE FUNCTION log_ticket_changes()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE actor UUID;
BEGIN
  actor := COALESCE(NEW.assigned_to, NEW.created_by);
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO ticket_history(ticket_id, actor_id, action, old_val, new_val)
    VALUES(NEW.id, actor, 'status_changed', OLD.status::TEXT, NEW.status::TEXT);
  END IF;
  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO ticket_history(ticket_id, actor_id, action, old_val, new_val)
    VALUES(NEW.id, actor, 'priority_changed', OLD.priority::TEXT, NEW.priority::TEXT);
  END IF;
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO ticket_history(ticket_id, actor_id, action, old_val, new_val)
    VALUES(NEW.id, actor, 'assigned', OLD.assigned_to::TEXT, NEW.assigned_to::TEXT);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_ticket_audit
  AFTER UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION log_ticket_changes();

-- ── RLS ───────────────────────────────────────────
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets           ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_history    ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications     ENABLE ROW LEVEL SECURITY;

-- Helper
CREATE OR REPLACE FUNCTION current_role_is(r user_role[])
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS
$$ SELECT EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = ANY(r)); $$;

-- Profiles
CREATE POLICY "own profile"     ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "agents see all"  ON profiles FOR SELECT USING (current_role_is(ARRAY['agent','admin']::user_role[]));
CREATE POLICY "own update"      ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "admin all"       ON profiles FOR ALL   USING (current_role_is(ARRAY['admin']::user_role[]));

-- Tickets: employees see own, agents/admins see all
CREATE POLICY "employee own tickets" ON tickets FOR SELECT
  USING (created_by = auth.uid() OR current_role_is(ARRAY['agent','admin']::user_role[]));
CREATE POLICY "employee create"      ON tickets FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "agent update"         ON tickets FOR UPDATE
  USING (current_role_is(ARRAY['agent','admin']::user_role[]));

-- Comments
CREATE POLICY "see comments" ON ticket_comments FOR SELECT
  USING (
    EXISTS(SELECT 1 FROM tickets t WHERE t.id = ticket_id AND (
      t.created_by = auth.uid() OR current_role_is(ARRAY['agent','admin']::user_role[])
    ))
    AND (NOT is_internal OR current_role_is(ARRAY['agent','admin']::user_role[]))
  );
CREATE POLICY "insert comments" ON ticket_comments FOR INSERT
  WITH CHECK (
    author_id = auth.uid() AND
    EXISTS(SELECT 1 FROM tickets t WHERE t.id = ticket_id AND (
      t.created_by = auth.uid() OR current_role_is(ARRAY['agent','admin']::user_role[])
    ))
  );

-- History: same as tickets
CREATE POLICY "see history" ON ticket_history FOR SELECT
  USING (EXISTS(SELECT 1 FROM tickets t WHERE t.id = ticket_id AND (
    t.created_by = auth.uid() OR current_role_is(ARRAY['agent','admin']::user_role[])
  )));

-- Notifications: own only
CREATE POLICY "own notifs"   ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "update notif" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- ── Seed: demo agent ───────────────────────────────
-- After creating a user, run:
-- UPDATE profiles SET role='admin' WHERE email='tu@empresa.com';
