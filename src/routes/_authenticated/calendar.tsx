import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { PageContainer, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Plug, Unplug } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  getCalendarStatus,
  startCalendarConnect,
  disconnectCalendar,
  listTodayEvents,
  type CalendarEvent,
} from "@/lib/calendar.functions";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — Alpha Momentum" },
      { name: "description", content: "Connect your Google Calendar so plans are built around real commitments." },
      { property: "og:title", content: "Calendar — Alpha Momentum" },
      { property: "og:description", content: "Your real commitments, wired into your execution plan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CalendarPage,
});

function waitForOAuthCompletion(popup: Window) {
  return new Promise<void>((resolve, reject) => {
    let poll: number | undefined;
    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      if (poll !== undefined) window.clearInterval(poll);
    };
    const onMessage = (event: MessageEvent) => {
      const type = event.data?.type;
      if (
        event.origin !== window.location.origin ||
        event.source !== popup ||
        event.data?.connectorId !== "google_calendar" ||
        (type !== "appUserConnectorOAuthComplete" && type !== "appUserConnectorOAuthFailed")
      )
        return;
      cleanup();
      if (type === "appUserConnectorOAuthComplete") return resolve();
      popup.close();
      reject(new Error("Connection failed."));
    };
    window.addEventListener("message", onMessage);
    poll = window.setInterval(() => {
      if (!popup.closed) return;
      cleanup();
      reject(new Error("Window closed before the connection finished."));
    }, 500);
  });
}

function CalendarPage() {
  const qc = useQueryClient();
  const statusFn = useServerFn(getCalendarStatus);
  const startFn = useServerFn(startCalendarConnect);
  const disconnectFn = useServerFn(disconnectCalendar);
  const eventsFn = useServerFn(listTodayEvents);
  const [connecting, setConnecting] = useState(false);

  const status = useQuery({
    queryKey: ["calendar-status"],
    queryFn: async () => (await statusFn()) as { connected: boolean },
  });

  const events = useQuery<CalendarEvent[]>({
    queryKey: ["calendar-today"],
    enabled: !!status.data?.connected,
    queryFn: async () => (await eventsFn()) as CalendarEvent[],
  });

  async function connect() {
    const popup = window.open("", "lovable-oauth", "width=600,height=720");
    if (!popup) {
      toast.error("Popup blocked. Allow popups and try again.");
      return;
    }
    setConnecting(true);
    try {
      const { authorizationUrl } = (await startFn()) as { authorizationUrl: string };
      const completion = waitForOAuthCompletion(popup);
      popup.location.href = authorizationUrl;
      await completion;
      toast.success("Google Calendar connected.");
      qc.invalidateQueries({ queryKey: ["calendar-status"] });
      qc.invalidateQueries({ queryKey: ["calendar-today"] });
    } catch (e: any) {
      popup.close();
      toast.error(e?.message ?? "Could not connect.");
    } finally {
      setConnecting(false);
    }
  }

  const disconnect = useMutation({
    mutationFn: async () => await disconnectFn(),
    onSuccess: () => {
      toast.success("Calendar disconnected.");
      qc.invalidateQueries({ queryKey: ["calendar-status"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <PageContainer>
      <PageHeader
        title="Calendar"
        description="Connect your Google Calendar so the strategist plans around real commitments, not an empty day."
      />

      <Card>
        <CardContent className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Google Calendar</p>
              <p className="text-xs text-muted-foreground">
                {status.isPending ? "Checking…" : status.data?.connected ? "Connected to your account" : "Not connected"}
              </p>
            </div>
          </div>
          {status.data?.connected ? (
            <Button variant="outline" onClick={() => disconnect.mutate()} disabled={disconnect.isPending}>
              <Unplug className="mr-2 h-4 w-4" /> {disconnect.isPending ? "Disconnecting…" : "Disconnect"}
            </Button>
          ) : (
            <Button onClick={connect} disabled={connecting}>
              <Plug className="mr-2 h-4 w-4" /> {connecting ? "Connecting…" : "Connect Google Calendar"}
            </Button>
          )}
        </CardContent>
      </Card>

      {status.data?.connected && (
        <div className="mt-8">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Today</h3>
          {events.isPending ? (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">Loading events…</CardContent></Card>
          ) : events.isError ? (
            <Card><CardContent className="p-6 text-sm">
              <p className="text-destructive">{(events.error as any)?.message ?? "Could not load events."}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => events.refetch()}>Retry</Button>
            </CardContent></Card>
          ) : events.data && events.data.length > 0 ? (
            <div className="space-y-2">
              {events.data.map((e) => (
                <Card key={e.id}><CardContent className="flex items-baseline gap-4 p-4 text-sm">
                  <span className="w-28 shrink-0 font-mono text-xs text-primary">
                    {e.allDay ? "All day" : e.start ? format(new Date(e.start), "HH:mm") : "—"}
                  </span>
                  <span className="min-w-0 flex-1">{e.summary}</span>
                </CardContent></Card>
              ))}
            </div>
          ) : (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">No events today — the day is yours.</CardContent></Card>
          )}
        </div>
      )}
    </PageContainer>
  );
}
