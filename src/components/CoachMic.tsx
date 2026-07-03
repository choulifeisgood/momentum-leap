import { useRouterState } from "@tanstack/react-router";
import { Mic, Square, Loader2 } from "lucide-react";
import { useVoiceCoach } from "@/lib/useVoiceCoach";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function CoachMic() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { recording, busy, startRecording, stopRecording } = useVoiceCoach({
    onTranscript: (t) => toast.message("You said:", { description: t }),
    onReply: (r) => toast.success("Coach", { description: r }),
  });

  // Hide on /coach (redundant) and /auth
  if (path.startsWith("/coach") || path.startsWith("/auth")) return null;

  const active = recording || busy !== null;
  const label = recording ? "Stop" : busy === "transcribing" ? "Transcribing…" : busy === "thinking" ? "Thinking…" : "Talk to coach";

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => (recording ? stopRecording() : startRecording())}
      disabled={busy !== null}
      className={cn(
        "fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full shadow-lg transition-all",
        "bg-primary text-primary-foreground hover:brightness-110",
        active && "ring-4 ring-primary/30",
        recording && "animate-pulse bg-destructive text-destructive-foreground",
      )}
    >
      {busy ? <Loader2 className="h-6 w-6 animate-spin" />
        : recording ? <Square className="h-5 w-5" />
        : <Mic className="h-6 w-6" />}
    </button>
  );
}
