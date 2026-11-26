import { prisma } from "../prisma";
import { decryptSecret, encryptSecret } from "../crypto";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function buildGoogleAuthUrl(tenantSlug: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/integrations/google/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
    ].join(" "),
    state: tenantSlug,
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string) {
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/integrations/google/callback`;

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    throw new Error(`Google OAuth error: ${await res.text()}`);
  }

  return (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };
}

async function getValidAccessToken(tenantId: string): Promise<{
  accessToken: string;
  calendarId: string;
} | null> {
  const conn = await prisma.googleCalendarConnection.findUnique({
    where: { tenantId },
  });

  if (!conn || !conn.syncEnabled) return null;

  let accessToken = decryptSecret(conn.accessTokenEncrypted);
  const refreshToken = decryptSecret(conn.refreshTokenEncrypted);

  const isExpired =
    conn.tokenExpiresAt && conn.tokenExpiresAt.getTime() < Date.now() + 60_000;

  if ((!accessToken || isExpired) && refreshToken && isGoogleOAuthConfigured()) {
    try {
      const res = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID || "",
          client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { access_token: string; expires_in?: number };
        accessToken = data.access_token;
        await prisma.googleCalendarConnection.update({
          where: { tenantId },
          data: {
            accessTokenEncrypted: encryptSecret(data.access_token),
            tokenExpiresAt: data.expires_in
              ? new Date(Date.now() + data.expires_in * 1000)
              : null,
          },
        });
      }
    } catch {
      return null;
    }
  }

  if (!accessToken) return null;
  return { accessToken, calendarId: conn.calendarId || "primary" };
}

export async function getGoogleBusyIntervals(
  tenantId: string,
  timeMin: Date,
  timeMax: Date
): Promise<Array<{ start: Date; end: Date }>> {
  const auth = await getValidAccessToken(tenantId);
  if (!auth) return [];

  try {
    const res = await fetch(`${GOOGLE_CALENDAR_API}/freeBusy`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        items: [{ id: auth.calendarId }],
      }),
    });

    if (!res.ok) return [];
    const data = (await res.json()) as {
      calendars?: Record<string, { busy?: Array<{ start: string; end: string }> }>;
    };
    const busy = data.calendars?.[auth.calendarId]?.busy ?? [];
    return busy.map((b) => ({ start: new Date(b.start), end: new Date(b.end) }));
  } catch {
    return [];
  }
}

export async function createGoogleCalendarEvent(params: {
  tenantId: string;
  summary: string;
  description: string;
  startsAt: Date;
  endsAt: Date;
  attendeeEmail?: string | null;
}): Promise<string | null> {
  const auth = await getValidAccessToken(params.tenantId);
  if (!auth) return null;

  try {
    const res = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(auth.calendarId)}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: params.summary,
          description: params.description,
          start: { dateTime: params.startsAt.toISOString() },
          end: { dateTime: params.endsAt.toISOString() },
          attendees: params.attendeeEmail ? [{ email: params.attendeeEmail }] : undefined,
        }),
      }
    );

    if (!res.ok) return null;
    const data = (await res.json()) as { id?: string };
    return data.id ?? null;
  } catch {
    return null;
  }
}

export async function updateGoogleCalendarEvent(params: {
  tenantId: string;
  googleEventId: string;
  startsAt: Date;
  endsAt: Date;
}): Promise<void> {
  const auth = await getValidAccessToken(params.tenantId);
  if (!auth) return;

  try {
    await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(auth.calendarId)}/events/${encodeURIComponent(params.googleEventId)}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          start: { dateTime: params.startsAt.toISOString() },
          end: { dateTime: params.endsAt.toISOString() },
        }),
      }
    );
  } catch {
    // Non-blocking sync
  }
}

export async function deleteGoogleCalendarEvent(
  tenantId: string,
  googleEventId: string
): Promise<void> {
  const auth = await getValidAccessToken(tenantId);
  if (!auth) return;

  try {
    await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(auth.calendarId)}/events/${encodeURIComponent(googleEventId)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
        },
      }
    );
  } catch {
    // Non-blocking sync
  }
}
