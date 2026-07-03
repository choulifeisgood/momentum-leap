import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { transcribeAudio, runCoachTurn, type ExecutedAction, type CoachTurnResult } from "@/lib/coach.functions";

type Options = {
  onTranscript?: (text: string) => void;
  onResult?: (result: CoachTurnResult) => void;
  onActions?: (actions: ExecutedAction[]) => void;
  onReply?: (reply: string) => void;
  getHistory?: () => Array<{ role: "user" | "assistant"; content: string }>;
  autoNavigate?: boolean;
};

export function useVoiceCoach(opts: Options = {}) {
  const transcribe = useServerFn(transcribeAudio);
  const coach = useServerFn(runCoachTurn);
  const router = useRouter();
  const qc = useQueryClient();

  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState<null | "transcribing" | "thinking">(null);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const submitText = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean) return;
      setBusy("thinking");
      try {
        const history = opts.getHistory?.() ?? [];
        const result = await coach({ data: { history, user_message: clean } });
        opts.onReply?.(result.reply);
        opts.onActions?.(result.actions);
        // Invalidate everything data-dependent
        qc.invalidateQueries();
        const nav = result.actions.reverse().find((a) => a.ok && a.navigate_to)?.navigate_to;
        if (nav && opts.autoNavigate !== false) {
          router.navigate({ to: nav as any });
        }
        return result;
      } catch (e: any) {
        toast.error(e?.message ?? "Coach failed");
      } finally {
        setBusy(null);
      }
    },
    [coach, qc, router, opts],
  );

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "";
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.start();
      mediaRef.current = recorder;
      setRecording(true);
    } catch (e: any) {
      toast.error("Microphone access denied.");
      stopStream();
    }
  }, []);

  const stopRecording = useCallback(async () => {
    const recorder = mediaRef.current;
    if (!recorder) return;
    setRecording(false);
    const done = new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        resolve(blob);
      };
    });
    recorder.stop();
    stopStream();
    const blob = await done;
    if (blob.size < 2048) {
      toast.error("Recording too short — hold the mic while you talk.");
      return;
    }
    setBusy("transcribing");
    try {
      const b64 = await blobToBase64(blob);
      const { text } = await transcribe({ data: { audio_base64: b64, mime: blob.type || "audio/webm" } });
      if (!text) {
        toast.error("Couldn't hear that. Try again.");
        return;
      }
      opts.onTranscript?.(text);
      await submitText(text);
    } catch (e: any) {
      toast.error(e?.message ?? "Transcription failed");
    } finally {
      setBusy(null);
    }
  }, [transcribe, submitText, opts]);

  useEffect(() => () => stopStream(), []);

  return { recording, busy, startRecording, stopRecording, submitText };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(r.error);
    r.onloadend = () => resolve(String(r.result));
    r.readAsDataURL(blob);
  });
}
