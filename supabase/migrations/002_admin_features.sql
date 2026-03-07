-- ====================================================
-- ITDesk — Migration 002: Admin Features
-- Ejecutar en Supabase SQL Editor
-- ====================================================

-- ── Invite tokens (admin crea usuarios sin registro) ──
CREATE TABLE IF NOT EXISTS invite_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token       TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  email       TEXT NOT NULL,
  role        user_role DEFAULT 'employee',
  department_id UUID REFERENCES departments(id),
  created_by  UUID NOT NULL REFERENCES profiles(id),
  used_at     TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── System activity log ───────────────────────────────
CREATE TABLE IF NOT EXISTS activity_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,   -- 'user.role_changed', 'ticket.auto_assigned', etc.
  target_type TEXT,            -- 'user', 'ticket', 'department'
  target_id   TEXT,
  meta        JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── SLA config per priority (admin-editable) ─────────
CREATE TABLE IF NOT EXISTS sla_config (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  priority      ticket_priority UNIQUE NOT NULL,
  response_min  INT NOT NULL,   -- minutes
  resolve_min   INT NOT NULL,
  updated_by    UUID REFERENCES profiles(id),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Default SLA values
INSERT INTO sla_config (priority, response_min, resolve_min) VALUES
  ('low',      1440, 4320),
  ('medium',    480, 1440),
  ('high',      240,  480),
  ('critical',   60,  240)
ON CONFLICT (priority) DO NOTHING;

-- ── Indexes ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_activity_log_actor  ON activity_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_time   ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invite_token        ON invite_tokens(token);

-- ── RLS ───────────────────────────────────────────────
ALTER TABLE invite_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_config    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_invite"    ON invite_tokens FOR ALL USING (current_role_is(ARRAY['admin']::user_role[]));
CREATE POLICY "agent_read_log"  ON activity_log  FOR SELECT USING (current_role_is(ARRAY['agent','admin']::user_role[]));
CREATE POLICY "admin_write_log" ON activity_log  FOR INSERT WITH CHECK (true);
CREATE POLICY "agent_read_sla"  ON sla_config    FOR SELECT USING (current_role_is(ARRAY['agent','admin']::user_role[]));
CREATE POLICY "admin_write_sla" ON sla_config    FOR ALL USING (current_role_is(ARRAY['admin']::user_role[]));
