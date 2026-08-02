import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function chatJSON(system: string, user: string) {
  const apiKey = process.env['OPENAI_API_KEY'];
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI error ${res.status}: ${text.slice(0, 300)}`);
  }
  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content returned from model");
  return JSON.parse(content) as Record<string, unknown>;
}

function isoDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// 1. AI Planner / Strategist — orders today's work against real capacity
// ---------------------------------------------------------------------------

export type PlanBlock = {
  time: string;
  task: string;
  minutes: number;
  why: string;
};

export type DayPlan = {
  headline: string;
  capacity_read: string;
  blocks: PlanBlock[];
  cut_list: string[];
  risk: string;
};

export const generateDayPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DayPlan> => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);

    const [tasksRes, outcomesRes, checkinRes, profileRes] = await Promise.all([
      supabase.from("tasks").select("title,estimated_minutes,energy_required,task_type,status,planned_time,outcome_id")
        .eq("user_id", userId).is("deleted_at", null).eq("task_date", today),
      supabase.from("outcomes").select("id,title,priority,deadline,success_metric")
        .eq("user_id", userId).is("deleted_at", null).eq("status", "active"),
      supabase.from("checkins").select("*").eq("user_id", userId).eq("date", today).maybeSingle(),
      supabase.from("profiles").select("role,profession,work_style,working_hours,preferred_focus_windows,tone")
        .eq("user_id", userId).maybeSingle(),
    ]);

    // Real commitments from Google Calendar, when the user has connected it.
    let calendar: unknown[] = [];
    try {
      const { getConnectionKeyForUser } = await import("@/lib/appUserConnections.server");
      const key = await getConnectionKeyForUser(userId, "google_calendar");
      if (key) {
        const start = new Date(); start.setHours(0, 0, 0, 0);
        const end = new Date(start); end.setDate(end.getDate() + 1);
        const { callAsAppUser } = await import("@/integrations/lovable/appUserConnector");
        const res = await callAsAppUser({
          gatewayBaseUrl: "https://connector-gateway.lovable.dev",
          connectionAPIKey: key,
          connectorId: "google_calendar",
          path: `/calendar/v3/calendars/primary/events?${new URLSearchParams({
            timeMin: start.toISOString(), timeMax: end.toISOString(),
            singleEvents: "true", orderBy: "startTime", maxResults: "50",
          }).toString()}`,
        });
        if (res.ok) {
          const json = (await res.json()) as { items?: any[] };
          calendar = (json.items ?? []).map((e) => ({
            summary: e.summary ?? "(busy)",
            start: e.start?.dateTime ?? e.start?.date,
            end: e.end?.dateTime ?? e.end?.date,
          }));
        }
      }
    } catch {
      // calendar is optional context — never block the plan on it
    }

    const payload = {
      today,
      tasks: tasksRes.data ?? [],
      outcomes: outcomesRes.data ?? [],
      checkin: checkinRes.data ?? null,
      profile: profileRes.data ?? null,
      calendar,
    };

    const parsed = await chatJSON(
      `You are a high-performance execution strategist. Given today's tasks, active strategic outcomes, the user's check-in (energy, stress, sleep, available capacity) and their profile, produce a realistic sequenced day plan.
Rules: never overload beyond available capacity; put deep work in high-energy windows; explicitly cut what does not fit; be direct, no fluff.
Return STRICT JSON: {"headline": string, "capacity_read": string, "blocks": [{"time": string, "task": string, "minutes": number, "why": string}], "cut_list": [string], "risk": string}.`,
      JSON.stringify(payload),
    );

    return {
      headline: String(parsed['headline'] ?? "Plan for today"),
      capacity_read: String(parsed['capacity_read'] ?? ""),
      blocks: Array.isArray(parsed['blocks']) ? (parsed['blocks'] as PlanBlock[]) : [],
      cut_list: Array.isArray(parsed['cut_list']) ? (parsed['cut_list'] as string[]) : [],
      risk: String(parsed['risk'] ?? ""),
    };
  });

// ---------------------------------------------------------------------------
// 2. Weekly summary
// ---------------------------------------------------------------------------

export type WeeklySummary = {
  headline: string;
  wins: string[];
  drift: string[];
  patterns: string[];
  next_week_focus: string[];
  stats: { tasks_completed: number; tasks_planned: number; checkins: number; avg_energy: number | null };
};

export const generateWeeklySummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WeeklySummary> => {
    const { supabase, userId } = context;
    const since = isoDaysAgo(7);

    const [tasksRes, checkinsRes, outcomesRes] = await Promise.all([
      supabase.from("tasks").select("title,status,task_date,estimated_minutes,actual_minutes,task_type,energy_required")
        .eq("user_id", userId).is("deleted_at", null).gte("task_date", since),
      supabase.from("checkins").select("*").eq("user_id", userId).gte("date", since).order("date"),
      supabase.from("outcomes").select("title,status,priority,deadline,success_metric")
        .eq("user_id", userId).is("deleted_at", null),
    ]);

    const tasks = tasksRes.data ?? [];
    const checkins = checkinsRes.data ?? [];
    const energies = checkins.map((c) => c.energy).filter((e): e is number => typeof e === "number");
    const stats = {
      tasks_completed: tasks.filter((t) => t.status === "done" || t.status === "completed").length,
      tasks_planned: tasks.length,
      checkins: checkins.length,
      avg_energy: energies.length ? Math.round((energies.reduce((a, b) => a + b, 0) / energies.length) * 10) / 10 : null,
    };

    const parsed = await chatJSON(
      `You are an execution analyst writing a weekly review for a high performer. Use only the data given.
Be specific and unsentimental. Name real patterns (energy vs completion, overplanning, neglected outcomes).
Return STRICT JSON: {"headline": string, "wins": [string], "drift": [string], "patterns": [string], "next_week_focus": [string]}. Max 4 items per array.`,
      JSON.stringify({ since, stats, tasks, checkins, outcomes: outcomesRes.data ?? [] }),
    );

    const arr = (k: string) => (Array.isArray(parsed[k]) ? (parsed[k] as string[]) : []);
    return {
      headline: String(parsed['headline'] ?? "Your week"),
      wins: arr("wins"),
      drift: arr("drift"),
      patterns: arr("patterns"),
      next_week_focus: arr("next_week_focus"),
      stats,
    };
  });

// ---------------------------------------------------------------------------
// 3. Adaptive check-in — AI picks the follow-up questions that matter today
// ---------------------------------------------------------------------------

export type AdaptiveQuestion = { key: string; label: string; placeholder: string };
export type AdaptiveCheckin = {
  greeting: string;
  questions: AdaptiveQuestion[];
  suggested: { energy: number; stress: number; available_capacity: number } | null;
};

export const getAdaptiveCheckin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdaptiveCheckin> => {
    const { supabase, userId } = context;
    const [recentRes, tasksRes] = await Promise.all([
      supabase.from("checkins").select("*").eq("user_id", userId).gte("date", isoDaysAgo(10)).order("date", { ascending: false }),
      supabase.from("tasks").select("title,status,task_date").eq("user_id", userId).is("deleted_at", null).gte("task_date", isoDaysAgo(3)),
    ]);

    const recent = recentRes.data ?? [];
    const parsed = await chatJSON(
      `You adapt a daily performance check-in. Based on the user's recent check-ins and recent task follow-through, choose 1-3 short follow-up questions that are actually informative TODAY (skip anything already stable/answered repeatedly).
Also predict plausible starting slider values so the user only adjusts.
Return STRICT JSON: {"greeting": string (one short sentence), "questions": [{"key": string snake_case, "label": string, "placeholder": string}], "suggested": {"energy": 1-10 number, "stress": 1-10 number, "available_capacity": 0-100 number}}.`,
      JSON.stringify({ recent_checkins: recent.slice(0, 7), recent_tasks: tasksRes.data ?? [] }),
    );

    const s = parsed['suggested'] as { energy?: number; stress?: number; available_capacity?: number } | undefined;
    return {
      greeting: String(parsed['greeting'] ?? "Quick calibration."),
      questions: (Array.isArray(parsed['questions']) ? (parsed['questions'] as AdaptiveQuestion[]) : []).slice(0, 3),
      suggested: s
        ? {
            energy: Number(s.energy ?? 7),
            stress: Number(s.stress ?? 4),
            available_capacity: Number(s.available_capacity ?? 70),
          }
        : null,
    };
  });

// Post-save coaching read on the check-in the user just logged.
export const getCheckinInsight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      energy: z.number(),
      stress: z.number(),
      available_capacity: z.number(),
      main_commitment: z.string().optional().default(""),
      extra: z.record(z.string(), z.string()).optional().default({}),
    }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ insight: string; adjustment: string }> => {
    const { supabase, userId } = context;
    const { data: recent } = await supabase
      .from("checkins").select("date,energy,stress,available_capacity,sleep_hours")
      .eq("user_id", userId).gte("date", isoDaysAgo(10)).order("date", { ascending: false });

    const parsed = await chatJSON(
      `You are a direct performance coach. Given today's check-in and the last days of check-ins, return STRICT JSON:
{"insight": string (1-2 sentences naming the real pattern), "adjustment": string (one concrete change to today's plan)}. No fluff, no medical advice.`,
      JSON.stringify({ today: data, recent: recent ?? [] }),
    );

    return {
      insight: String(parsed['insight'] ?? ""),
      adjustment: String(parsed['adjustment'] ?? ""),
    };
  });
