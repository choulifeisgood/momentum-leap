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
// Tool schemas (OpenAI function-calling format)
// ============================================================================

const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_today_snapshot",
      description: "Get today's summary: date, active goals, today's tasks, latest check-in, streak.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "list_weekly_goals",
      description: "List the user's weekly goals.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["active", "completed", "all"], description: "Filter by status. Default active." },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_today_tasks",
      description: "List tasks scheduled for today.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "create_weekly_goal",
      description: "Create a new weekly goal. Prefer including a 'why' — it drives motivation.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Concrete outcome. e.g., 'Finish chemistry chapters 4-6'." },
          why: { type: "string", description: "The identity/motivation behind it." },
          target_date: { type: "string", description: "YYYY-MM-DD. Defaults to end of this week." },
        },
        required: ["title"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_weekly_goal_status",
      description: "Mark a weekly goal as active or completed.",
      parameters: {
        type: "object",
        properties: {
          goal_id: { type: "string" },
          status: { type: "string", enum: ["active", "completed"] },
        },
        required: ["goal_id", "status"],
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
          estimated_minutes: { type: "number", description: "Default 25." },
          difficulty: { type: "string", enum: ["Easy", "Medium", "Hard"] },
          task_type: { type: "string", enum: ["Deep Work", "Shallow", "Exercise", "Study", "Admin", "Other"] },
          task_date: { type: "string", description: "YYYY-MM-DD. Default today." },
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
          status: { type: "string", enum: ["Not started", "In progress", "Done"] },
        },
        required: ["task_id", "status"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_implementation_intention",
      description: "Attach an if-then plan to a task. e.g. 'If it's 7pm, then I open my chem textbook.'",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string" },
          if_situation: { type: "string" },
          then_action: { type: "string" },
        },
        required: ["task_id", "if_situation", "then_action"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_checkin",
      description: "Log or update today's daily check-in. Overwrites existing today's entry.",
      parameters: {
        type: "object",
        properties: {
          sleep_hours: { type: "number", description: "0-14" },
          exercise_minutes: { type: "number", description: "0-300" },
          energy: { type: "number", description: "1-5" },
          focus: { type: "number", description: "1-5" },
          mood: { type: "number", description: "1-5" },
          reflection: { type: "string" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "start_recovery_plan",
      description: "Generate a 4-step recovery plan when the user has fallen behind.",
      parameters: {
        type: "object",
        properties: { reason: { type: "string" } },
        required: ["reason"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "navigate",
      description: "Move the user to a page after completing an action.",
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

const SYSTEM_PROMPT = `You are Momentum, an execution coach inside a student productivity app grounded in behavioral psychology (implementation intentions, tiny habits, identity-based habits).

You have TOOLS to read and modify the user's real data (goals, tasks, check-ins, recovery). Act on voice/text commands directly — the user has approved auto-execution.

Rules:
- Be concise and warm. 1-3 sentences per reply. No lists unless the user asked.
- Prefer ACTION over discussion. If the user says "add a task X", call create_task immediately. If they describe their day, call log_checkin.
- Use get_today_snapshot at the start of a new topic to ground yourself in real data. Do NOT invent goals/tasks that don't exist.
- After write actions, briefly confirm what you did in plain language.
- If a required field is missing and it's not reasonable to default, ask ONE short clarifying question.
- Default task_date to today. Default estimated_minutes to 25, difficulty to "Medium", task_type to "Study" when unspecified.
- For check-ins: infer energy/focus/mood as 1-5 from tone if the user gives descriptors ("great" ~ 5, "meh" ~ 2). Ask only if genuinely ambiguous.
- Use navigate() only when it clearly helps (e.g., after logging a check-in, navigate to /dashboard).
- Never fabricate IDs. To modify a specific goal/task, first call list_weekly_goals or list_today_tasks.`;

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
      const [{ data: goals }, { data: tasks }, { data: checkin }] = await Promise.all([
        sb.from("weekly_goals").select("id,title,why,status,target_date").eq("user_id", uid),
        sb.from("daily_tasks").select("id,title,status,estimated_minutes,difficulty").eq("user_id", uid).eq("task_date", today),
        sb.from("daily_checkins").select("*").eq("user_id", uid).eq("date", today).maybeSingle(),
      ]);
      return {
        result: { today, goals: goals ?? [], today_tasks: tasks ?? [], today_checkin: checkin ?? null },
        summary: `Snapshot: ${goals?.length ?? 0} goals, ${tasks?.length ?? 0} tasks, check-in ${checkin ? "logged" : "missing"}.`,
      };
    }

    case "list_weekly_goals": {
      const status = (args.status as string) ?? "active";
      let q = sb.from("weekly_goals").select("id,title,why,status,target_date").eq("user_id", uid);
      if (status !== "all") q = q.eq("status", status);
      const { data } = await q;
      return { result: data ?? [], summary: `Loaded ${data?.length ?? 0} goals.` };
    }

    case "list_today_tasks": {
      const { data } = await sb.from("daily_tasks").select("id,title,status,estimated_minutes,difficulty,task_type")
        .eq("user_id", uid).eq("task_date", today);
      return { result: data ?? [], summary: `Loaded ${data?.length ?? 0} tasks for today.` };
    }

    case "create_weekly_goal": {
      const { data, error } = await sb.from("weekly_goals").insert({
        user_id: uid,
        title: String(args.title),
        why: (args.why as string) ?? null,
        target_date: (args.target_date as string) ?? null,
        status: "active",
      }).select().single();
      if (error) throw error;
      return { result: data, summary: `Created goal "${data.title}".`, navigate_to: "/goals" };
    }

    case "update_weekly_goal_status": {
      const { data, error } = await sb.from("weekly_goals")
        .update({ status: args.status }).eq("id", args.goal_id).eq("user_id", uid).select().single();
      if (error) throw error;
      return { result: data, summary: `Goal marked ${args.status}.` };
    }

    case "create_task": {
      const { data, error } = await sb.from("daily_tasks").insert({
        user_id: uid,
        title: String(args.title),
        estimated_minutes: (args.estimated_minutes as number) ?? 25,
        difficulty: (args.difficulty as string) ?? "Medium",
        task_type: (args.task_type as string) ?? "Study",
        task_date: (args.task_date as string) ?? today,
        status: "Not started",
      }).select().single();
      if (error) throw error;
      return { result: data, summary: `Added task "${data.title}".`, navigate_to: "/tasks" };
    }

    case "update_task_status": {
      const { data, error } = await sb.from("daily_tasks")
        .update({ status: args.status }).eq("id", args.task_id).eq("user_id", uid).select().single();
      if (error) throw error;
      return { result: data, summary: `Task marked ${args.status}.` };
    }

    case "create_implementation_intention": {
      const { data, error } = await sb.from("implementation_intentions").insert({
        user_id: uid,
        task_id: args.task_id,
        if_situation: args.if_situation,
        then_action: args.then_action,
      }).select().single();
      if (error) throw error;
      return { result: data, summary: `If-then plan attached.` };
    }

    case "log_checkin": {
      const payload: Record<string, unknown> = {
        user_id: uid,
        date: today,
        sleep_hours: args.sleep_hours ?? null,
        exercise_minutes: args.exercise_minutes ?? null,
        energy: args.energy ?? null,
        focus: args.focus ?? null,
        mood: args.mood ?? null,
        reflection: args.reflection ?? null,
      };
      const { data, error } = await sb.from("daily_checkins").upsert(payload, { onConflict: "user_id,date" }).select().single();
      if (error) throw error;
      return { result: data, summary: `Today's check-in logged.`, navigate_to: "/dashboard" };
    }

    case "start_recovery_plan": {
      const steps = [
        "Take 5 slow breaths. Nothing to fix yet.",
        "Pick the ONE most important task for today.",
        "Do a 15-minute version of it right now.",
        "Log a check-in tonight, no matter how the day went.",
      ];
      const { data, error } = await sb.from("recovery_plans").insert({
        user_id: uid,
        reason: args.reason,
        steps,
        status: "active",
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
// Coach turn: text in, actions + reply out (multi-step tool loop)
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

    // Multi-step tool loop
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
        // No more tools — return final assistant text
        return {
          reply: (msg.content ?? "").trim() || "Done.",
          actions,
          messages,
        };
      }

      // Execute each tool call
      for (const call of toolCalls) {
        const name = call.function.name;
        let parsedArgs: Record<string, unknown> = {};
        try { parsedArgs = JSON.parse(call.function.arguments || "{}"); } catch { /* ignore */ }
        try {
          const exec = await execTool(name, parsedArgs, ctx);
          actions.push({ tool: name, args: parsedArgs, ok: true, summary: exec.summary, navigate_to: exec.navigate_to });
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify(exec.result).slice(0, 4000),
          });
        } catch (e: any) {
          actions.push({ tool: name, args: parsedArgs, ok: false, summary: e?.message ?? "Tool failed" });
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify({ error: e?.message ?? String(e) }),
          });
        }
      }
    }

    return { reply: "I did several steps but need you to check the results.", actions, messages };
  });

// ============================================================================
// Transcription (OpenAI Whisper via gpt-4o-mini-transcribe)
// ============================================================================

const TranscribeInput = z.object({
  audio_base64: z.string().min(100),
  mime: z.string().default("audio/webm"),
});

export const transcribeAudio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => TranscribeInput.parse(input))
  .handler(async ({ data }): Promise<{ text: string }> => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

    const b64 = data.audio_base64.includes(",") ? data.audio_base64.split(",")[1] : data.audio_base64;
    const buf = Buffer.from(b64, "base64");
    if (buf.byteLength < 1024) throw new Error("Recording too short. Please try again.");

    const mime = data.mime.split(";")[0];
    const ext = mime === "audio/mp4" ? "mp4"
      : mime === "audio/mpeg" ? "mp3"
      : mime === "audio/wav" ? "wav"
      : mime === "audio/ogg" ? "ogg"
      : "webm";

    const form = new FormData();
    const blob = new Blob([buf], { type: mime });
    form.append("file", blob, `voice.${ext}`);
    form.append("model", "gpt-4o-mini-transcribe");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Transcription ${res.status}: ${text.slice(0, 300)}`);
    }
    const json = await res.json();
    return { text: String(json.text ?? "").trim() };
  });
