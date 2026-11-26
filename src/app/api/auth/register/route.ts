import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AuthTokenType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { createTenantWithDefaults } from "@/lib/tenant";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sendTransactionalEmail } from "@/lib/notifications";

const registerSchema = z.object({
  name: z.string().min(2, "Ingresa tu nombre"),
  email: z.string().email("Correo inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  businessName: z.string().min(2, "Ingresa el nombre de tu negocio"),
  slug: z.string().min(2, "Ingresa un subdominio válido"),
  timezone: z.string().optional(),
  industry: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await checkRateLimit({
      key: `auth_register:${ip}`,
      limit: 5,
      windowSeconds: 60,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Demasiados registros desde esta IP. Intenta de nuevo en un minuto." },
        { status: 429 }
      );
    }
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Datos inválidos" },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Ya existe una cuenta registrada con ese correo." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name.trim(),
        email,
        passwordHash,
      },
    });

    let tenant;
    try {
      tenant = await createTenantWithDefaults({
        name: parsed.data.businessName,
        slug: parsed.data.slug,
        ownerUserId: user.id,
        timezone: parsed.data.timezone,
        email,
        industry: parsed.data.industry,
      });
    } catch (err) {
      await prisma.user.delete({ where: { id: user.id } });
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "No se pudo crear el workspace" },
        { status: 400 }
      );
    }

    await setSessionCookie({
      userId: user.id,
      email: user.email,
      name: user.name,
      isSuperAdmin: user.isSuperAdmin,
    });

    // Send welcome & verification email (non-blocking)
    try {
      const verifyToken = crypto.randomBytes(24).toString("hex");
      await prisma.authToken.create({
        data: {
          userId: user.id,
          type: AuthTokenType.EMAIL_VERIFY,
          token: verifyToken,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
      const origin =
        process.env.NEXT_PUBLIC_APP_URL ||
        `${request.nextUrl.protocol}//${request.nextUrl.host}`;
      const verifyUrl = `${origin}/login?verifyToken=${verifyToken}`;
      await sendTransactionalEmail(
        user.email,
        `Bienvenido a AgenteIA — ${tenant.name}`,
        `Hola ${user.name},\n\nTu workspace "${tenant.name}" ya está listo.\nConfirma tu correo electrónico aquí: ${verifyUrl}\n\nPanel de control: ${origin}/dashboard/${tenant.slug}`
      );
    } catch {
      // Non-fatal if email delivery fails
    }

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email },
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error interno al registrar" },
      { status: 500 }
    );
  }
}
