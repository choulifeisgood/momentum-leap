import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Send, Sparkles, Command, Check, AlertCircle } from "lucide-react";
import { runCoachTurn, type ExecutedAction } from "@/lib/coach.functions";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string; actions?: ExecutedAction[] };

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const runCoach = useServerFn(runCoachTurn);
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const history = messages.map((m) => ({ role: m.role, content: m.content })).slice(-10);
    setMessages((p) => [...p, { role: "user", content: text }]);
    setInput("");
    setBusy(true);
    try {
      const res = await runCoach({ data: { history, user_message: text } });
      setMessages((p) => [...p, { role: "assistant", content: res.reply, actions: res.actions }]);
      qc.invalidateQueries();
      const nav = res.actions.find((a) => a.ok && a.navigate_to);
      if (nav?.navigate_to) navigate({ to: nav.navigate_to as any });
    } catch (e: any) {
      setMessages((p) => [...p, { role: "assistant", content: e?.message ?? "Something went wrong." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="hidden items-center gap-2 md:inline-flex"
        onClick={() => setOpen(true)}
      >
        <Command className="h-3.5 w-3.5" />
        <span className="text-xs">Command</span>
        <kbd className="ml-2 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px]">⌘K</kbd>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0">
          <div className="flex items-center gap-2 border-b border-border p-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
              }}
              placeholder="Tell Alpha what to do — add a task, log check-in, start recovery…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              disabled={busy}
            />
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={send} disabled={busy || !input.trim()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>

          <div className="max-h-[50vh] space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && !busy && (
              <div className="space-y-1 text-xs text-muted-foreground">
                <div>Try:</div>
                <div className="rounded border border-border bg-muted/40 px-2 py-1">Add a task: draft investor update, 45 min</div>
                <div className="rounded border border-border bg-muted/40 px-2 py-1">Log check-in: energy 7, stress 4, slept 7h</div>
                <div className="rounded border border-border bg-muted/40 px-2 py-1">Start recovery — I got pulled into meetings all day</div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={cn("space-y-2", m.role === "user" ? "text-right" : "text-left")}>
                <div className={cn(
                  "inline-block max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
                )}>
                  {m.content}
                </div>
                {m.actions && m.actions.length > 0 && (
                  <div className="space-y-1">
                    {m.actions.map((a, j) => (
                      <div key={j} className={cn(
                        "flex items-center gap-2 rounded border px-2 py-1 text-[11px]",
                        a.ok ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5 text-destructive",
                      )}>
                        {a.ok ? <Check className="h-3 w-3 text-primary" /> : <AlertCircle className="h-3 w-3" />}
                        <span className="font-medium">{a.tool}</span>
                        <span className="text-muted-foreground">— {a.summary}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {busy && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Thinking…
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
