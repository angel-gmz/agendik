import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, hashPassword, setSessionCookie, verifyPassword } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const inv = await prisma.tenantInvitation.findUnique({
    where: { token },
    include: { tenant: { select: { name: true, slug: true } } },
  });

  if (!inv) {
    return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: inv.email },
    select: { id: true },
  });

  return NextResponse.json({
    email: inv.email,
    role: inv.role,
    tenantName: inv.tenant.name,
    tenantSlug: inv.tenant.slug,
    expired: inv.expiresAt < new Date(),
    accepted: Boolean(inv.acceptedAt),
    userExists: Boolean(existingUser),
  });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const body = await request.json().catch(() => ({}));

    const inv = await prisma.tenantInvitation.findUnique({
      where: { token },
      include: { tenant: true },
    });

    if (!inv || inv.acceptedAt || inv.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Esta invitación ya expiró o fue utilizada." },
        { status: 400 }
      );
    }

    let user = await prisma.user.findUnique({ where: { email: inv.email } });
    const session = await getSession();

    if (!user) {
      const name = String(body.name || "").trim();
      const password = String(body.password || "");
      if (name.length < 2 || password.length < 6) {
        return NextResponse.json(
          { error: "Ingresa tu nombre y una contraseña de al menos 6 caracteres." },
          { status: 400 }
        );
      }
      user = await prisma.user.create({
        data: {
          name,
          email: inv.email,
          passwordHash: await hashPassword(password),
          emailVerifiedAt: new Date(),
        },
      });
    } else if (!session || session.userId !== user.id) {
      const password = String(body.password || "");
      if (!password || !(await verifyPassword(password, user.passwordHash))) {
        return NextResponse.json(
          { error: "Ya existe una cuenta con este correo. Ingresa tu contraseña para aceptar." },
          { status: 401 }
        );
      }
    }

    await prisma.tenantMembership.upsert({
      where: {
        tenantId_userId: {
          tenantId: inv.tenantId,
          userId: user.id,
        },
      },
      create: {
        tenantId: inv.tenantId,
        userId: user.id,
        role: inv.role,
      },
      update: {
        role: inv.role,
      },
    });

    await prisma.tenantInvitation.update({
      where: { id: inv.id },
      data: { acceptedAt: new Date() },
    });

    await setSessionCookie({
      userId: user.id,
      email: user.email,
      name: user.name,
      isSuperAdmin: user.isSuperAdmin,
    });

    return NextResponse.json({
      ok: true,
      tenantSlug: inv.tenant.slug,
    });
  } catch {
    return NextResponse.json({ error: "Error aceptando invitación" }, { status: 500 });
  }
}
