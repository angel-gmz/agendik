import { NextRequest, NextResponse } from "next/server";
import { requireTenantAccess } from "@/lib/auth";
import { canUseGoogleCalendar } from "@/lib/billing/entitlements";
import {
  buildGoogleAuthUrl,
  isGoogleOAuthConfigured,
} from "@/lib/integrations/google-calendar";

export async function GET(request: NextRequest) {
  const tenantSlug = request.nextUrl.searchParams.get("tenantSlug");
  if (!tenantSlug) {
    return NextResponse.json({ error: "tenantSlug requerido" }, { status: 400 });
  }

  try {
    const { tenant } = await requireTenantAccess(tenantSlug, ["OWNER", "ADMIN"]);
    const calCheck = canUseGoogleCalendar(tenant.plan);
    if (!calCheck.allowed) {
      return NextResponse.json({ error: calCheck.reason }, { status: 403 });
    }
    if (!isGoogleOAuthConfigured()) {
      return NextResponse.json(
        {
          error:
            "Google OAuth no está configurado en variables de entorno (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).",
        },
        { status: 400 }
      );
    }

    const url = buildGoogleAuthUrl(tenantSlug);
    return NextResponse.redirect(url);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "No autorizado" },
      { status: 401 }
    );
  }
}
