import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_BASE_URL = "https://connector-gateway.lovable.dev";
const CONNECTOR_ID = "google_calendar";

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
];

export const startCalendarConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const clientKey = process.env['GOOGLE_CALENDAR_APP_USER_CONNECTOR_CLIENT_API_KEY'];
    if (!clientKey) throw new Error("Google Calendar connector client is not configured");

    const request = getRequest();
    if (!request) throw new Error("OAuth must start from an app request.");
    const returnUrl = new URL("/oauth/google-calendar/return", request.url).toString();

    const { authorizeAppUserOAuth } = await import("@/integrations/lovable/appUserConnector");
    const { getConnectionKeyForUser } = await import("@/lib/appUserConnections.server");
    const existing = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);

    const { authorizationUrl } = await authorizeAppUserOAuth({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectorId: CONNECTOR_ID,
      appUserId: context.userId,
      clientAPIKey: clientKey,
      returnUrl,
      connectionAPIKey: existing ?? undefined,
      credentialsConfiguration: { scopes: GOOGLE_SCOPES },
    });
    return { authorizationUrl };
  });

export const completeCalendarConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code: string }) => input)
  .handler(async ({ data, context }) => {
    const { exchangeAppUserOAuthCode } = await import("@/integrations/lovable/appUserConnector");
    const { saveConnectionKeyForUser } = await import("@/lib/appUserConnections.server");
    const { connectionAPIKey, connectorId } = await exchangeAppUserOAuthCode(
      GATEWAY_BASE_URL,
      data.code,
    );
    if (connectorId !== CONNECTOR_ID) throw new Error("OAuth completion returned the wrong connector");
    await saveConnectionKeyForUser(context.userId, connectorId, connectionAPIKey);
    return { ok: true };
  });

export const getCalendarStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ connected: boolean }> => {
    const { getConnectionKeyForUser } = await import("@/lib/appUserConnections.server");
    const key = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);
    return { connected: !!key };
  });

export const disconnectCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getConnectionKeyForUser, deleteConnectionForUser } = await import("@/lib/appUserConnections.server");
    const key = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);
    if (key) {
      const { disconnectAppUser } = await import("@/integrations/lovable/appUserConnector");
      try {
        await disconnectAppUser({ gatewayBaseUrl: GATEWAY_BASE_URL, connectionAPIKey: key, connectorId: CONNECTOR_ID });
      } catch {
        // gateway already dropped it — still clear locally
      }
    }
    await deleteConnectionForUser(context.userId, CONNECTOR_ID);
    return { ok: true };
  });

export type CalendarEvent = { id: string; summary: string; start: string; end: string; allDay: boolean };

export const listTodayEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CalendarEvent[]> => {
    const { getConnectionKeyForUser } = await import("@/lib/appUserConnections.server");
    const connectionAPIKey = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);
    if (!connectionAPIKey) throw new Error("Google Calendar is not connected");

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const params = new URLSearchParams({
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "50",
    });

    const { callAsAppUser } = await import("@/integrations/lovable/appUserConnector");
    const res = await callAsAppUser({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectionAPIKey,
      connectorId: CONNECTOR_ID,
      path: `/calendar/v3/calendars/primary/events?${params.toString()}`,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Calendar request failed [${res.status}]: ${body.slice(0, 300)}`);
    }
    const json = (await res.json()) as { items?: any[] };
    return (json.items ?? []).map((e) => ({
      id: String(e.id),
      summary: String(e.summary ?? "(no title)"),
      start: String(e.start?.dateTime ?? e.start?.date ?? ""),
      end: String(e.end?.dateTime ?? e.end?.date ?? ""),
      allDay: !e.start?.dateTime,
    }));
  });

export const scheduleTaskOnCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { title: string; startIso: string; minutes: number }) => input)
  .handler(async ({ data, context }) => {
    const { getConnectionKeyForUser } = await import("@/lib/appUserConnections.server");
    const connectionAPIKey = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);
    if (!connectionAPIKey) throw new Error("Google Calendar is not connected");

    const startAt = new Date(data.startIso);
    const endAt = new Date(startAt.getTime() + Math.max(15, data.minutes) * 60000);

    const { callAsAppUser } = await import("@/integrations/lovable/appUserConnector");
    const res = await callAsAppUser({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectionAPIKey,
      connectorId: CONNECTOR_ID,
      path: "/calendar/v3/calendars/primary/events",
      init: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: data.title,
          description: "Scheduled from Alpha Momentum",
          start: { dateTime: startAt.toISOString() },
          end: { dateTime: endAt.toISOString() },
        }),
      },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Could not create event [${res.status}]: ${body.slice(0, 300)}`);
    }
    const json = (await res.json()) as { id?: string; htmlLink?: string };
    return { id: json.id ?? "", link: json.htmlLink ?? "" };
  });
