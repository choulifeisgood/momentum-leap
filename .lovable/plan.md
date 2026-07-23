
# Alpha Momentum — Phase 1 Build Plan

Pivot from student-oriented "Project Codename" to a High-Performer Execution OS called **Alpha Momentum**. Later phases (calendar, telemetry, research mode, weekly review, admin analytics, health integrations) intentionally excluded.

## 1. Rebrand & language
- `src/lib/brand.ts` → name **Alpha Momentum**, short **Alpha**, new tagline: *"Turn important goals into reliable execution."*
- Sidebar/nav relabeled: Dashboard→**Command Center**, Weekly Goals→**Outcomes**, Today's Tasks→**Today**, Daily Check-In→**Check-In**, Recovery Mode→**Recovery**, Progress→**Performance**, If-Then Builder→**Intentions**, AI Breakdown→**Breakdown**, Achievements→**Milestones**.
- All copy scrubbed of student/homework/badge/study-streak language → replaced with execution reliability / focus consistency / recovery quality / commitment accuracy.
- Landing page rewritten for founders / executives / knowledge workers.

## 2. Database — clean slate migration
Drop old tables (`weekly_goals`, `daily_tasks`, `implementation_intentions`, `daily_checkins`, `recovery_plans`, `achievements`, `beta_feedback`) and rebuild:

- **profiles** (extended): `role`, `profession`, `work_style`, `timezone`, `working_hours` (jsonb), `preferred_focus_windows` (jsonb), `health_priorities` (text[]), `top_objectives` (text), `onboarded_at`.
- **strategic_areas**: `id`, `user_id`, `name`, `color`, `deleted_at`.
- **outcomes**: `id`, `user_id`, `strategic_area_id?`, `title`, `success_metric`, `why_it_matters`, `deadline?`, `priority` (critical/important/maintenance/optional), `status` (active/paused/done/abandoned), `constraints`, `non_goals`, `completed_at`, `deleted_at`.
- **tasks**: `id`, `user_id`, `outcome_id?`, `title`, `estimated_minutes`, `actual_minutes?`, `energy_required` (low/med/high), `task_type` (deep/shallow/admin/decision/research/waiting), `task_date`, `planned_time?`, `status`, `completed_at`, `deleted_at`.
- **intentions**: `id`, `user_id`, `task_id?`, `if_context`, `then_action`, `obstacle`, `backup_plan`, `deleted_at`.
- **checkins**: `id`, `user_id`, `date` (unique per user), `energy`, `stress`, `sleep_hours?`, `sleep_quality?`, `available_capacity`, `main_commitment`, `obstacle?`, `unexpected_event?`, `raw_voice?`.
- **recovery_plans**: `id`, `user_id`, `trigger`, `what_changed`, `remaining_capacity`, `must_save`, `defer_list`, `smallest_action`, `plan_text`, `deleted_at`.
- **milestones** (professional achievements): `id`, `user_id`, `name`, `description`, `category`, `unlocked_at`.
- **feedback**: same shape as before.
- **agent_actions** (audit + undo): `id`, `user_id`, `tool`, `payload` (jsonb), `undo_payload` (jsonb), `summary`, `created_at`.

RLS: `auth.uid() = user_id` on every table. Grants: `authenticated` + `service_role`. Soft-delete via `deleted_at` on all user-content tables; all queries filter `deleted_at IS NULL`.

## 3. Onboarding wizard (`/onboarding`)
5-step modal after first sign-in: role → profession + work style → timezone + working hours → focus windows + health priorities → top 1-3 objectives (each becomes an outcome). Writes `profiles.onboarded_at`. Auth gate redirects users without `onboarded_at`.

## 4. Command Center (`/dashboard` → decision-first)
Sections in order:
1. **Top 3 outcomes today** (auto-picked by priority + deadline proximity, editable).
2. **Next best action** (single task card, big CTA to start/complete).
3. **Deadline risk panel** (outcomes with deadline within N days and incomplete tasks).
4. **Realistic capacity today** (planned minutes vs. estimated free minutes from working_hours).
5. **Overload warning** (banner if planned > capacity).

## 5. Outcomes + Tasks pages
- `/outcomes`: hierarchy view grouped by strategic area, priority badges, status filters, deadline column, "why it matters" preview.
- `/today`: today's tasks list with drag-to-schedule (planned_time), quick-add, intention chip per task, complete/defer/delete with undo toast (30s).
- All destructive actions: confirm dialog + soft-delete + `agent_actions` audit + toast with **Undo** action.
- `/trash`: 30-day view of soft-deleted items, restore or permanent delete.

## 6. Adaptive Check-In (modal)
- On first dashboard visit each day (if no checkin row exists), popup modal appears with X to dismiss (dismissal remembered per-day in localStorage).
- 3–5 adaptive questions max: energy, stress, capacity, main commitment. Voice-input button on each field (uses existing Whisper flow).
- "Nothing changed" one-tap fills from yesterday.
- Writes `checkins`; recommendations on dashboard adjust to energy/capacity.

## 7. Universal NL command bar (⌘K)
- Global `<CommandPalette>` mounted in `AppShell`, opens on ⌘K / Ctrl-K or button.
- Single text input → sends to existing coach server function (with expanded tool catalog for new schema).
- Streams the assistant reply + executed actions inline in the palette; press Esc to close, Enter to send.
- Coach tool catalog rewritten for new tables (create_outcome, create_task, schedule_task, log_checkin, start_recovery, navigate_to, soft_delete, undo_last_action).

## 8. AI upgrades
- Coach & Breakdown both continue on OpenAI (`gpt-4o-mini`) via `OPENAI_API_KEY`.
- Coach system prompt rewritten for professional/executive tone, aware of the new hierarchy and soft-delete semantics.
- Breakdown now emits: milestones, tasks, decision points, risks, research questions, time estimates (structured JSON), with "Add all to outcome" one-click.
- Add `undo_last_action` tool that reads latest `agent_actions` row and reverses it.

## 9. Recovery Mode (professional restart)
- Redesigned flow: what changed → remaining capacity → rank must-save → suggest defers → smallest next action → AI-generated plan text.
- Non-shaming copy: "Recalculate the plan", "Protect the critical outcome", etc.

## 10. Performance page (renamed Progress)
- Charts: execution reliability (% planned tasks completed / week), focus consistency, recovery quality, energy vs. deep work trend. Empty states until 7 days of data.

## 11. Achievements → Milestones (professional)
- No cartoon badges. Understated cards: "Consistent Executor — 4 weeks ≥80% completion", "Recovery Master — restarted within 24h", "Deep Focus — 10h uninterrupted work in a week", etc. Auto-unlocked from real data. AI can add custom milestones.

## 12. Settings
- Tabs: Profile, Preferences (tone: direct/warm/coach; language; timezone), Notifications (placeholder for phase 2), Privacy & Data (export JSON, delete account), Health disclaimer, Trash.

## 13. Safety, security, undo
- Every mutating server fn writes an `agent_actions` row with reverse-payload.
- Confirm dialog on destructive operations; 30-second undo toast for soft deletes.
- Account deletion + JSON data export server functions.

## What is deliberately deferred to later phases
Google Calendar / Outlook / Apple Calendar, browser + desktop + mobile telemetry, Research Mode with citations, weekly adaptive review with recommendations, personal execution model learning loop, health-device integrations, notifications engine, admin analytics dashboard, thinking-effort tiers, monthly product-wide AI upgrade pipeline.

## Technical notes (skip if non-technical)
- One migration: drop-if-exists old tables, create new schema, RLS + GRANTs, updated_at triggers, unique `(user_id, date)` on `checkins`, indexes on `(user_id, deleted_at)`, `(user_id, task_date, deleted_at)`, `(user_id, deadline)`.
- Server fns in `src/lib/*.functions.ts`, all `.middleware([requireSupabaseAuth])`.
- Reuse existing `useVoiceCoach` hook; extend coach tool catalog + system prompt in `src/lib/coach.functions.ts`.
- Regenerate Supabase types after migration; then rewrite all pages against new schema in one batch.
- Soft-delete pattern: `deleted_at timestamptz null`, always filter in selects, restore = set null.

Estimated: ~1 large migration + ~20 file writes/rewrites.
