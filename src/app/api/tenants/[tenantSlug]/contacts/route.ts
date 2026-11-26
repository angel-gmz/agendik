import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireTenantAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await context.params;
    const { tenant } = await requireTenantAccess(tenantSlug);

    const contacts = await prisma.contact.findMany({
      where: { tenantId: tenant.id },
      include: {
        _count: {
          select: { conversations: true, appointments: true },
        },
        appointments: {
          orderBy: { startsAt: "desc" },
          take: 3,
          include: { service: { select: { name: true } } },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });

    return NextResponse.json({ contacts });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error cargando contactos" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await context.params;
    const { tenant } = await requireTenantAccess(tenantSlug);
    const body = await request.json();

    await prisma.contact.updateMany({
      where: { id: body.id, tenantId: tenant.id },
      data: {
        name: body.name ?? undefined,
        email: body.email ?? undefined,
        phone: body.phone ?? undefined,
        notes: body.notes ?? undefined,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error actualizando contacto" }, { status: 500 });
  }
}
