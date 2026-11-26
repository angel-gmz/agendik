import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { AuthTokenType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sendTransactionalEmail } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = typeof body.token === "string" ? body.token.trim() : "";

    if (token) {
      const record = await prisma.authToken.findUnique({ where: { token } });
      if (
        !record ||
        record.type !== AuthTokenType.EMAIL_VERIFY ||
        record.usedAt ||
        record.expiresAt < new Date()
      ) {
        return NextResponse.json({ error: "Token de verificación inválido o expirado." }, { status: 400 });
      }

      await prisma.$transaction([
        prisma.user.update({
          where: { id: record.userId },
          data: { emailVerifiedAt: new Date() },
        }),
        prisma.authToken.update({
          where: { id: record.id },
          data: { usedAt: new Date() },
        }),
      ]);

      return NextResponse.json({ ok: true, verified: true });
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const newToken = crypto.randomBytes(24).toString("hex");
    await prisma.authToken.create({
      data: {
        userId: session.userId,
        type: AuthTokenType.EMAIL_VERIFY,
        token: newToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    const verifyUrl = `${origin}/login?verifyToken=${newToken}`;

    await sendTransactionalEmail(
      session.email,
      "Verifica tu correo en AgenteIA",
      `Hola ${session.name || ""},\n\nPor favor confirma tu correo electrónico haciendo clic en el siguiente enlace (válido por 24 horas):\n${verifyUrl}\n\nSi no solicitaste esto, puedes ignorar este correo.`
    );

    const exposeDevToken = process.env.NODE_ENV !== "production" && !process.env.SMTP_HOST;
    return NextResponse.json({
      ok: true,
      message: "Correo de verificación enviado.",
      ...(exposeDevToken ? { token: newToken } : {}),
    });
  } catch {
    return NextResponse.json({ error: "Error verificando correo" }, { status: 500 });
  }
}
