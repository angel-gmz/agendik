import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { AuthTokenType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sendTransactionalEmail } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await checkRateLimit({
      key: `forgot_password:${ip}`,
      limit: 5,
      windowSeconds: 60,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Intenta de nuevo en un minuto." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const email = String(body.email || "").toLowerCase().trim();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Correo inválido" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    let devResetUrl: string | undefined;

    if (user) {
      const token = crypto.randomBytes(24).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

      await prisma.authToken.create({
        data: {
          userId: user.id,
          type: AuthTokenType.PASSWORD_RESET,
          token,
          expiresAt,
        },
      });

      const origin =
        process.env.NEXT_PUBLIC_APP_URL ||
        `${request.nextUrl.protocol}//${request.nextUrl.host}`;
      const resetUrl = `${origin}/reset-password?token=${token}`;

      await sendTransactionalEmail(
        user.email,
        "Restablece tu contraseña en AgenteIA",
        `Hola ${user.name},\n\nRecibimos una solicitud para restablecer tu contraseña. Usa este enlace (válido por 1 hora):\n${resetUrl}\n\nSi no solicitaste este cambio, ignora este mensaje.`
      );

      if (process.env.NODE_ENV !== "production" && !process.env.SMTP_HOST) {
        devResetUrl = resetUrl;
      }
    }

    return NextResponse.json({
      ok: true,
      message:
        "Si el correo existe en nuestra plataforma, recibirás instrucciones para restablecer tu contraseña.",
      ...(devResetUrl ? { devResetUrl } : {}),
    });
  } catch {
    return NextResponse.json({ error: "Error procesando solicitud" }, { status: 500 });
  }
}
