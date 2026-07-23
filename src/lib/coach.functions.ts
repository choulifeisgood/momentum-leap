import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { format } from "date-fns";

// ============================================================================
// Types
// ============================================================================

export type ChatMsg = {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
};

export type ExecutedAction = {
  tool: string;
  args_json: string;
  ok: boolean;
  summary: string;
  navigate_to?: string;
};

export type CoachTurnResult = {
  reply: string;
  actions: ExecutedAction[];
};

// ============================================================================
// Tool schemas (OpenAI function-calling format) — Alpha Momentum schema
// ============================================================================

const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_today_snapshot",
      description: "Get today's summary: date, active outcomes, today's tasks, latest check-in.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "list_outcomes",
      description: "List the user's strategic outcomes.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["active", "paused", "done", "abandoned", "all"], description: "Default active." },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_today_tasks",
      description: "List tasks for today.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "create_outcome",
      description: "Create a new strategic outcome.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          why_it_matters: { type: "string" },
          success_metric: { type: "string" },
          deadline: { type: "string", description: "YYYY-MM-DD" },
          priority: { type: "string", enum: ["critical", "important", "maintenance", "optional"] },
        },
        required: ["title"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_outcome_status",
      description: "Change an outcome's status.",
      parameters: {
        type: "object",
        properties: {
          outcome_id: { type: "string" },
          status: { type: "string", enum: ["active", "paused", "done", "abandoned"] },
        },
        required: ["outcome_id", "status"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Add a task for a given day (default today).",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          estimated_minutes: { type: "number", description: "Default 60." },
          energy_required: { type: "string", enum: ["low", "medium", "high"] },
          task_type: { type: "string", enum: ["deep", "shallow", "admin", "decision", "research", "waiting"] },
          task_date: { type: "string", description: "YYYY-MM-DD. Default today." },
          outcome_id: { type: "string", description: "Optional parent outcome id." },
        },
        required: ["title"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_task_status",
      description: "Change a task's status.",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string" },
          status: { type: "string", enum: ["pending", "in_progress", "done", "deferred"] },
        },
        required: ["task_id", "status"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_intention",
      description: "Attach an if-then plan to a task.",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string" },
          if_context: { type: "string" },
          then_action: { type: "string" },
          obstacle: { type: "string" },
          backup_plan: { type: "string" },
        },
        required: ["if_context", "then_action"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_checkin",
      description: "Log or update today's check-in.",
      parameters: {
        type: "object",
        properties: {
          energy: { type: "number", description: "1-10" },
          stress: { type: "number", description: "1-10" },
          sleep_hours: { type: "number" },
          sleep_quality: { type: "number", description: "1-10" },
          available_capacity: { type: "number", description: "0-100 (%)" },
          main_commitment: { type: "string" },
          obstacle: { type: "string" },
          unexpected_event: { type: "string" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "start_recovery",
      description: "Create a recovery plan.",
      parameters: {
        type: "object",
        properties: {
          trigger: { type: "string" },
          what_changed: { type: "string" },
          must_save: { type: "string" },
          smallest_action: { type: "string" },
        },
        required: ["trigger"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "navigate",
      description: "Move the user to a page.",
      parameters: {
        type: "object",
        properties: {
          route: {
            type: "string",
            enum: ["/dashboard", "/goals", "/tasks", "/checkin", "/recovery", "/progress", "/intentions", "/breakdown", "/achievements"],
          },
        },
        required: ["route"],
        additionalProperties: false,
      },
    },
  },
] as const;

const SYSTEM_PROMPT = `You are the Alpha Momentum coach — a decision-first execution coach for high performers (founders, executives, operators).

You have TOOLS to read and modify the user's real data (outcomes, tasks, check-ins, intentions, recovery). Act on voice/text commands directly — the user has approved auto-execution.

Style:
- Direct, executive, calm. Zero hype. 1-3 sentences per reply. No lists unless explicitly asked.
- Prefer ACTION over commentary. If the user says "add a task", call create_task immediately.
- Use get_today_snapshot at the start of a new topic to ground yourself in real data.
- After write actions, confirm briefly in plain language.
- Ask ONE short clarifying question only when a required field is genuinely ambiguous.
- Defaults: task_date = today; estimated_minutes = 60; energy_required = "medium"; task_type = "deep".
- For check-ins: infer 1-10 from tone ("great" ~ 8, "wrecked" ~ 3).
- Never fabricate IDs. To modify a specific outcome/task, first list_outcomes or list_today_tasks.`;

// ============================================================================
// Tool executors
// ============================================================================

type Ctx = { supabase: any; userId: string };

async function execTool(
  name: string,
  args: Record<string, unknown>,
  ctx: Ctx,
): Promise<{ result: unknown; summary: string; navigate_to?: string }> {
  const today = format(new Date(), "yyyy-MM-dd");
  const sb = ctx.supabase;
  const uid = ctx.userId;

  switch (name) {
    case "get_today_snapshot": {
      const [{ data: outcomes }, { data: tasks }, { data: checkin }] = await Promise.all([
        sb.from("outcomes").select("id,title,why_it_matters,status,deadline,priority").eq("user_id", uid).is("deleted_at", null).eq("status", "active"),
        sb.from("tasks").select("id,title,status,estimated_minutes,energy_required,task_type").eq("user_id", uid).is("deleted_at", null).eq("task_date", today),
        sb.from("checkins").select("*").eq("user_id", uid).eq("date", today).maybeSingle(),
      ]);
      return {
        result: { today, outcomes: outcomes ?? [], today_tasks: tasks ?? [], today_checkin: checkin ?? null },
        summary: `Snapshot: ${outcomes?.length ?? 0} outcomes, ${tasks?.length ?? 0} tasks, check-in ${checkin ? "logged" : "missing"}.`,
      };
    }

    case "list_outcomes": {
      const status = (args.status as string) ?? "active";
      let q = sb.from("outcomes").select("id,title,why_it_matters,status,deadline,priority,success_metric")
        .eq("user_id", uid).is("deleted_at", null);
      if (status !== "all") q = q.eq("status", status);
      const { data } = await q;
      return { result: data ?? [], summary: `Loaded ${data?.length ?? 0} outcomes.` };
    }

    case "list_today_tasks": {
      const { data } = await sb.from("tasks")
        .select("id,title,status,estimated_minutes,energy_required,task_type")
        .eq("user_id", uid).is("deleted_at", null).eq("task_date", today);
      return { result: data ?? [], summary: `Loaded ${data?.length ?? 0} tasks for today.` };
    }

    case "create_outcome": {
      const { data, error } = await sb.from("outcomes").insert({
        user_id: uid,
        title: String(args.title),
        why_it_matters: (args.why_it_matters as string) ?? null,
        success_metric: (args.success_metric as string) ?? null,
        deadline: (args.deadline as string) ?? null,
        priority: (args.priority as string) ?? "important",
        status: "active",
      }).select().single();
      if (error) throw error;
      return { result: data, summary: `Created outcome "${data.title}".`, navigate_to: "/goals" };
    }

    case "update_outcome_status": {
      const patch: Record<string, unknown> = { status: args.status };
      if (args.status === "done") patch.completed_at = new Date().toISOString();
      const { data, error } = await sb.from("outcomes")
        .update(patch).eq("id", args.outcome_id).eq("user_id", uid).select().single();
      if (error) throw error;
      return { result: data, summary: `Outcome marked ${args.status}.` };
    }

    case "create_task": {
      const { data, error } = await sb.from("tasks").insert({
        user_id: uid,
        title: String(args.title),
        estimated_minutes: (args.estimated_minutes as number) ?? 60,
        energy_required: (args.energy_required as string) ?? "medium",
        task_type: (args.task_type as string) ?? "deep",
        task_date: (args.task_date as string) ?? today,
        outcome_id: (args.outcome_id as string) ?? null,
        status: "pending",
      }).select().single();
      if (error) throw error;
      return { result: data, summary: `Added task "${data.title}".`, navigate_to: "/tasks" };
    }

    case "update_task_status": {
      const patch: Record<string, unknown> = { status: args.status };
      if (args.status === "done") patch.completed_at = new Date().toISOString();
      const { data, error } = await sb.from("tasks")
        .update(patch).eq("id", args.task_id).eq("user_id", uid).select().single();
      if (error) throw error;
      return { result: data, summary: `Task marked ${args.status}.` };
    }

    case "create_intention": {
      const { data, error } = await sb.from("intentions").insert({
        user_id: uid,
        task_id: (args.task_id as string) ?? null,
        if_context: args.if_context,
        then_action: args.then_action,
        obstacle: (args.obstacle as string) ?? null,
        backup_plan: (args.backup_plan as string) ?? null,
      }).select().single();
      if (error) throw error;
      return { result: data, summary: `If-then plan attached.` };
    }

    case "log_checkin": {
      const payload: Record<string, unknown> = { user_id: uid, date: today };
      const allowed = ["energy", "stress", "sleep_hours", "sleep_quality", "available_capacity",
        "main_commitment", "obstacle", "unexpected_event"];
      for (const k of allowed) if (args[k] !== undefined) payload[k] = args[k];
      const { data, error } = await sb.from("checkins")
        .upsert(payload, { onConflict: "user_id,date" }).select().single();
      if (error) throw error;
      return { result: data, summary: `Today's check-in logged.`, navigate_to: "/dashboard" };
    }

    case "start_recovery": {
      const trigger = String(args.trigger ?? "recovery");
      const plan_text = [
        `1. Contain: name the trigger — ${trigger}.`,
        `2. Protect: ${(args.must_save as string) ?? "the critical outcome"}.`,
        `3. Restart: ${(args.smallest_action as string) ?? "smallest 10-minute step"}.`,
      ].join("\n");
      const { data, error } = await sb.from("recovery_plans").insert({
        user_id: uid,
        trigger,
        what_changed: (args.what_changed as string) ?? null,
        must_save: (args.must_save as string) ?? null,
        smallest_action: (args.smallest_action as string) ?? null,
        plan_text,
      }).select().single();
      if (error) throw error;
      return { result: data, summary: `Recovery plan created.`, navigate_to: "/recovery" };
    }

    case "navigate": {
      return { result: { route: args.route }, summary: `Opening ${args.route}.`, navigate_to: String(args.route) };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ============================================================================
// OpenAI call
// ============================================================================

async function openaiChat(body: unknown): Promise<any> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

// ============================================================================
// Coach turn
// ============================================================================

const CoachInput = z.object({
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })).max(30),
  user_message: z.string().min(1).max(2000),
});

export const runCoachTurn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CoachInput.parse(input))
  .handler(async ({ data, context }): Promise<CoachTurnResult> => {
    const ctx: Ctx = { supabase: context.supabase, userId: context.userId };
    const actions: ExecutedAction[] = [];

    const messages: ChatMsg[] = [
      { role: "system", content: SYSTEM_PROMPT + `\n\nToday's date: ${format(new Date(), "yyyy-MM-dd")} (${format(new Date(), "EEEE")}).` },
      ...data.history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: data.user_message },
    ];

    for (let step = 0; step < 6; step++) {
      const res = await openaiChat({
        model: "gpt-4o-mini",
        temperature: 0.4,
        messages,
        tools: TOOLS,
        tool_choice: "auto",
      });

      const choice = res.choices?.[0];
      const msg = choice?.message;
      if (!msg) throw new Error("No response from model");

      messages.push({
        role: "assistant",
        content: msg.content ?? "",
        tool_calls: msg.tool_calls,
      });

      const toolCalls = msg.tool_calls ?? [];
      if (toolCalls.length === 0) {
        return { reply: (msg.content ?? "").trim() || "Done.", actions };
      }

      for (const call of toolCalls) {
        const name = call.function.name;
        const argsRaw = call.function.arguments || "{}";
        let parsedArgs: Record<string, unknown> = {};
        try { parsedArgs = JSON.parse(argsRaw); } catch { /* ignore */ }
        try {
          const exec = await execTool(name, parsedArgs, ctx);
          actions.push({ tool: name, args_json: argsRaw, ok: true, summary: exec.summary, navigate_to: exec.navigate_to });
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify(exec.result).slice(0, 4000),
          });
        } catch (e: any) {
          actions.push({ tool: name, args_json: argsRaw, ok: false, summary: e?.message ?? "Tool failed" });
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify({ error: e?.message ?? String(e) }),
          });
        }
      }
    }

    return { reply: "Done.", actions };
  });

// ============================================================================
// Audio transcription
// ============================================================================

const TranscribeInput = z.object({
  audio_base64: z.string().min(10),
  mime: z.string().default("audio/webm"),
});

export const transcribeAudio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => TranscribeInput.parse(input))
  .handler(async ({ data }): Promise<{ text: string }> => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

    // Strip data-URL prefix if present.
    const b64 = data.audio_base64.includes(",") ? data.audio_base64.split(",")[1] : data.audio_base64;
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: data.mime });

    const ext = data.mime.includes("mp4") ? "mp4" : data.mime.includes("mpeg") ? "mp3" : "webm";
    const form = new FormData();
    form.append("file", blob, `recording.${ext}`);
    form.append("model", "whisper-1");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Transcription failed ${res.status}: ${t.slice(0, 300)}`);
    }
    const json = await res.json();
    return { text: String(json?.text ?? "").trim() };
  });
