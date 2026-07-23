
-- =========================================================
-- DROP OLD TABLES (fresh start; keep profiles + auth)
-- =========================================================
DROP TABLE IF EXISTS public.beta_feedback CASCADE;
DROP TABLE IF EXISTS public.achievements CASCADE;
DROP TABLE IF EXISTS public.recovery_plans CASCADE;
DROP TABLE IF EXISTS public.daily_checkins CASCADE;
DROP TABLE IF EXISTS public.implementation_intentions CASCADE;
DROP TABLE IF EXISTS public.daily_tasks CASCADE;
DROP TABLE IF EXISTS public.weekly_goals CASCADE;

-- =========================================================
-- Shared updated_at trigger fn
-- =========================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =========================================================
-- PROFILES: extend
-- =========================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text,
  ADD COLUMN IF NOT EXISTS profession text,
  ADD COLUMN IF NOT EXISTS work_style text,
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS working_hours jsonb,
  ADD COLUMN IF NOT EXISTS preferred_focus_windows jsonb,
  ADD COLUMN IF NOT EXISTS health_priorities text[],
  ADD COLUMN IF NOT EXISTS top_objectives text,
  ADD COLUMN IF NOT EXISTS tone text DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS onboarded_at timestamptz;

-- Drop student_type if it exists
ALTER TABLE public.profiles DROP COLUMN IF EXISTS student_type;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS preferred_categories;

-- =========================================================
-- STRATEGIC AREAS
-- =========================================================
CREATE TABLE public.strategic_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT 'blue',
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.strategic_areas TO authenticated;
GRANT ALL ON public.strategic_areas TO service_role;
ALTER TABLE public.strategic_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own strategic_areas" ON public.strategic_areas FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_strategic_areas_user ON public.strategic_areas(user_id, deleted_at);
CREATE TRIGGER trg_strategic_areas_updated BEFORE UPDATE ON public.strategic_areas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- OUTCOMES
-- =========================================================
CREATE TABLE public.outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strategic_area_id uuid REFERENCES public.strategic_areas(id) ON DELETE SET NULL,
  title text NOT NULL,
  success_metric text,
  why_it_matters text,
  deadline date,
  priority text NOT NULL DEFAULT 'important' CHECK (priority IN ('critical','important','maintenance','optional')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','done','abandoned')),
  constraints text,
  non_goals text,
  completed_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outcomes TO authenticated;
GRANT ALL ON public.outcomes TO service_role;
ALTER TABLE public.outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own outcomes" ON public.outcomes FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_outcomes_user ON public.outcomes(user_id, deleted_at);
CREATE INDEX idx_outcomes_deadline ON public.outcomes(user_id, deadline) WHERE deleted_at IS NULL;
CREATE TRIGGER trg_outcomes_updated BEFORE UPDATE ON public.outcomes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- TASKS
-- =========================================================
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  outcome_id uuid REFERENCES public.outcomes(id) ON DELETE SET NULL,
  title text NOT NULL,
  estimated_minutes integer DEFAULT 30,
  actual_minutes integer,
  energy_required text DEFAULT 'medium' CHECK (energy_required IN ('low','medium','high')),
  task_type text DEFAULT 'deep' CHECK (task_type IN ('deep','shallow','admin','decision','research','waiting')),
  task_date date,
  planned_time text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','done','deferred')),
  completed_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tasks" ON public.tasks FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_tasks_user_date ON public.tasks(user_id, task_date, deleted_at);
CREATE INDEX idx_tasks_outcome ON public.tasks(outcome_id) WHERE deleted_at IS NULL;
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- INTENTIONS
-- =========================================================
CREATE TABLE public.intentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  if_context text NOT NULL,
  then_action text NOT NULL,
  obstacle text,
  backup_plan text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.intentions TO authenticated;
GRANT ALL ON public.intentions TO service_role;
ALTER TABLE public.intentions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own intentions" ON public.intentions FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_intentions_user ON public.intentions(user_id, deleted_at);
CREATE TRIGGER trg_intentions_updated BEFORE UPDATE ON public.intentions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- CHECKINS
-- =========================================================
CREATE TABLE public.checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  energy integer CHECK (energy BETWEEN 1 AND 10),
  stress integer CHECK (stress BETWEEN 1 AND 10),
  sleep_hours numeric(3,1),
  sleep_quality integer CHECK (sleep_quality BETWEEN 1 AND 10),
  available_capacity integer,
  main_commitment text,
  obstacle text,
  unexpected_event text,
  raw_voice text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkins TO authenticated;
GRANT ALL ON public.checkins TO service_role;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own checkins" ON public.checkins FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_checkins_user_date ON public.checkins(user_id, date DESC);
CREATE TRIGGER trg_checkins_updated BEFORE UPDATE ON public.checkins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- RECOVERY PLANS
-- =========================================================
CREATE TABLE public.recovery_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trigger text,
  what_changed text,
  remaining_capacity text,
  must_save text,
  defer_list text,
  smallest_action text,
  plan_text text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recovery_plans TO authenticated;
GRANT ALL ON public.recovery_plans TO service_role;
ALTER TABLE public.recovery_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own recovery" ON public.recovery_plans FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_recovery_user ON public.recovery_plans(user_id, deleted_at);
CREATE TRIGGER trg_recovery_updated BEFORE UPDATE ON public.recovery_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- MILESTONES (professional achievements)
-- =========================================================
CREATE TABLE public.milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.milestones TO authenticated;
GRANT ALL ON public.milestones TO service_role;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own milestones" ON public.milestones FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_milestones_user ON public.milestones(user_id, unlocked_at DESC);

-- =========================================================
-- FEEDBACK
-- =========================================================
CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  confusing text,
  useful text,
  return_reason text,
  bug_report text,
  rating integer CHECK (rating BETWEEN 1 AND 10),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own feedback" ON public.feedback FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- AGENT ACTIONS (audit + undo)
-- =========================================================
CREATE TABLE public.agent_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool text NOT NULL,
  payload jsonb,
  undo_payload jsonb,
  summary text,
  reversed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_actions TO authenticated;
GRANT ALL ON public.agent_actions TO service_role;
ALTER TABLE public.agent_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own agent_actions" ON public.agent_actions FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_agent_actions_user ON public.agent_actions(user_id, created_at DESC);
