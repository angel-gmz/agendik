import { NextRequest, NextResponse } from "next/server";
import { processDueAppointmentReminders } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  const configuredSecret = process.env.CRON_SECRET?.trim();
  if (process.env.NODE_ENV === "production" && !configuredSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET no está configurado en producción" },
      { status: 500 }
    );
  }

  const secret = request.headers.get("x-cron-secret") || request.nextUrl.searchParams.get("secret");
  if (configuredSecret && secret !== configuredSecret) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const result = await processDueAppointmentReminders();
  return NextResponse.json({ ok: true, ...result });
}
