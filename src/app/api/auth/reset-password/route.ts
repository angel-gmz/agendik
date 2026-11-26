import { NextRequest, NextResponse } from "next/server";
import { AuthTokenType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = String(body.token || "").trim();
    const password = String(body.password || "");

    if (!token || password.length < 6) {
      return NextResponse.json(
        { error: "Token inválido o contraseña menor a 6 caracteres." },
        { status: 400 }
      );
    }

    const record = await prisma.authToken.findUnique({ where: { token } });
    if (
      !record ||
      record.type !== AuthTokenType.PASSWORD_RESET ||
      record.usedAt ||
      record.expiresAt < new Date()
    ) {
      return NextResponse.json(
        { error: "El enlace de recuperación es inválido o ha expirado." },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      prisma.authToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ ok: true, message: "Contraseña actualizada correctamente." });
  } catch {
    return NextResponse.json({ error: "Error restableciendo contraseña" }, { status: 500 });
  }
}
