import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PageContainer, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, Square, Send, Loader2, Sparkles, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVoiceCoach } from "@/lib/useVoiceCoach";
import type { ExecutedAction } from "@/lib/coach.functions";

export const Route = createFileRoute("/_authenticated/coach")({
  head: () => ({ meta: [{ title: "AI Coach" }] }),
  component: CoachPage,
});

type Msg = {
  role: "user" | "assistant";
  content: string;
  actions?: ExecutedAction[];
};

function CoachPage() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hi. I'm your execution coach. Tell me what you want to do — set a goal, add a task, log your day, or just think out loud. Tap the mic to talk or type below.",
    },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { recording, busy, startRecording, stopRecording, submitText } = useVoiceCoach({
    getHistory: () => messages.map((m) => ({ role: m.role, content: m.content })).slice(-12),
    onTranscript: (t) => setMessages((prev) => [...prev, { role: "user", content: t }]),
    onResult: (r) => setMessages((prev) => [...prev, { role: "assistant", content: r.reply, actions: r.actions }]),
    autoNavigate: false,
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function send(text: string) {
    const clean = text.trim();
    if (!clean) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: clean }]);
    await submitText(clean); // assistant appended via onResult
  }

  // Voice: transcript already appended by onTranscript. We need to append assistant after.
  // Wrap: watch for last user with no assistant follow and no busy — nothing extra needed
  // because submitText resolves inside useVoiceCoach and we append via onReply? We handle it here:
  // Simplest: subscribe by wrapping the mic buttons ourselves.
  async function handleMicStop() {
    // stopRecording internally: transcribes -> submitText -> resolves
    // We can't easily read the result; instead handle text separately.
    await stopRecording();
  }

  return (
    <PageContainer>
      <PageHeader
        title="AI Coach"
        description="Talk or type. The coach can read your data and take actions for you — creating goals, adding tasks, logging check-ins, and more."
      />

      <Card className="flex h-[calc(100vh-16rem)] min-h-[500px] flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-6">
          {messages.map((m, i) => (
            <MessageBubble key={i} msg={m} />
          ))}
          {busy && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {busy === "transcribing" ? "Transcribing…" : "Thinking…"}
            </div>
          )}
        </div>

        <div className="border-t border-border p-4">
          <div className="flex items-end gap-2">
            <Button
              type="button"
              variant={recording ? "destructive" : "secondary"}
              size="icon"
              className={cn("h-11 w-11 shrink-0", recording && "animate-pulse")}
              disabled={busy !== null}
              onClick={() => (recording ? handleMicStop() : startRecording())}
              aria-label={recording ? "Stop recording" : "Start recording"}
            >
              {recording ? <Square className="h-4 w-4" /> : <Mic className="h-5 w-5" />}
            </Button>
            <Textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder={recording ? "Listening…" : "Say something like: I slept 7 hours, add a task to write my essay for 45 min…"}
              className="min-h-[44px] resize-none"
              disabled={busy !== null || recording}
            />
            <Button
              type="button"
              size="icon"
              className="h-11 w-11 shrink-0"
              disabled={!input.trim() || busy !== null}
              onClick={() => send(input)}
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Auto-execute is ON. The coach will create/update your goals, tasks and check-ins directly.
          </p>
        </div>
      </Card>
    </PageContainer>
  );
}

function MessageBubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
      )}
      <div className={cn("max-w-[80%] space-y-2")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground",
          )}
        >
          {msg.content}
        </div>
        {msg.actions && msg.actions.length > 0 && (
          <div className="space-y-1">
            {msg.actions.map((a, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs",
                  a.ok
                    ? "border-primary/20 bg-primary/5 text-foreground"
                    : "border-destructive/30 bg-destructive/5 text-destructive",
                )}
              >
                {a.ok ? <Check className="h-3.5 w-3.5 text-primary" /> : <AlertCircle className="h-3.5 w-3.5" />}
                <span className="font-medium">{a.tool}</span>
                <span className="text-muted-foreground">— {a.summary}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
