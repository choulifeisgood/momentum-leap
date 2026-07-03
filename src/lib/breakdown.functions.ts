import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const InputSchema = z.object({ goal: z.string().min(3).max(2000) });

export type Breakdown = {
  first_step: string;
  focus_block: string;
  subtask: string;
  checkpoint: string;
  obstacle: string;
  backup: string;
  unfinished: string;
};

export const generateBreakdown = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<Breakdown> => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

    const system = `You are a productivity coach for students grounded in behavioral psychology (implementation intentions, tiny habits, if-then planning).
Break down the user's goal into a concrete, non-overwhelming plan.
Return STRICT JSON only with exactly these keys: first_step, focus_block, subtask, checkpoint, obstacle, backup, unfinished.
Each value is one short, specific sentence (max ~200 chars). No markdown, no preamble.`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.6,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: `Goal: ${data.goal}` },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenAI error ${res.status}: ${text.slice(0, 300)}`);
    }

    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content returned from model");

    const parsed = JSON.parse(content) as Partial<Breakdown>;
    const keys: (keyof Breakdown)[] = [
      "first_step", "focus_block", "subtask", "checkpoint", "obstacle", "backup", "unfinished",
    ];
    const out = {} as Breakdown;
    for (const k of keys) {
      out[k] = String(parsed[k] ?? "").trim() || "—";
    }
    return out;
  });
