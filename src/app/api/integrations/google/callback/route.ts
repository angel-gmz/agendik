import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/crypto";
import { exchangeGoogleCode } from "@/lib/integrations/google-calendar";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const tenantSlug = request.nextUrl.searchParams.get("state");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!code || !tenantSlug) {
    return NextResponse.redirect(`${appUrl}/?google_error=missing_params`);
  }

  try {
    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) {
      return NextResponse.redirect(`${appUrl}/?google_error=tenant_not_found`);
    }

    const tokens = await exchangeGoogleCode(code);

    // Fetch user email
    let googleEmail: string | undefined;
    try {
      const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (profileRes.ok) {
        const profile = (await profileRes.json()) as { email?: string };
        googleEmail = profile.email;
      }
    } catch {
      // Optional
    }

    await prisma.googleCalendarConnection.upsert({
      where: { tenantId: tenant.id },
      create: {
        tenantId: tenant.id,
        googleEmail,
        calendarId: "primary",
        accessTokenEncrypted: encryptSecret(tokens.access_token),
        refreshTokenEncrypted: tokens.refresh_token
          ? encryptSecret(tokens.refresh_token)
          : null,
        tokenExpiresAt: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : null,
        syncEnabled: true,
      },
      update: {
        googleEmail,
        accessTokenEncrypted: encryptSecret(tokens.access_token),
        refreshTokenEncrypted: tokens.refresh_token
          ? encryptSecret(tokens.refresh_token)
          : undefined,
        tokenExpiresAt: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : null,
        syncEnabled: true,
      },
    });

    return NextResponse.redirect(
      `${appUrl}/dashboard/${tenantSlug}/channels?google=connected`
    );
  } catch {
    return NextResponse.redirect(
      `${appUrl}/dashboard/${tenantSlug}/channels?google=error`
    );
  }
}
