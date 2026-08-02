import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { completeCalendarConnect } from "@/lib/calendar.functions";

export const Route = createFileRoute("/oauth/google-calendar/return")({
  head: () => ({
    meta: [
      { title: "Connecting Google Calendar — Alpha Momentum" },
      { name: "description", content: "Finishing your Google Calendar connection." },
      { property: "og:title", content: "Connecting Google Calendar — Alpha Momentum" },
      { property: "og:description", content: "Finishing your Google Calendar connection." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OAuthReturn,
});

function OAuthReturn() {
  const [message, setMessage] = useState("Finishing connection…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const notify = (type: "appUserConnectorOAuthComplete" | "appUserConnectorOAuthFailed") => {
      window.opener?.postMessage({ type, connectorId: "google_calendar" }, window.location.origin);
      window.close();
    };

    if (params.get("success") !== "true") {
      setMessage(params.get("error") ?? "OAuth did not complete.");
      notify("appUserConnectorOAuthFailed");
      return;
    }
    const code = params.get("code");
    if (!code) {
      if (params.get("offline_access_allowed") === "false") {
        notify("appUserConnectorOAuthComplete");
        return;
      }
      setMessage("OAuth completed without an exchange code.");
      notify("appUserConnectorOAuthFailed");
      return;
    }
    void completeCalendarConnect({ data: { code } })
      .then(() => notify("appUserConnectorOAuthComplete"))
      .catch(() => {
        setMessage("Could not finish the connection.");
        notify("appUserConnectorOAuthFailed");
      });
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <p className="text-sm text-muted-foreground">{message}</p>
    </main>
  );
}
