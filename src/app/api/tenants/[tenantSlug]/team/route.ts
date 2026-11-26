import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { TenantRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AuthError, requireTenantAccess } from "@/lib/auth";
import { requireTenantRole } from "@/lib/rbac";
import { canInviteMember } from "@/lib/billing/entitlements";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await context.params;
    const { tenant, role } = await requireTenantAccess(tenantSlug);

    const [members, invitations] = await Promise.all([
      prisma.tenantMembership.findMany({
        where: { tenantId: tenant.id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              emailVerifiedAt: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.tenantInvitation.findMany({
        where: {
          tenantId: tenant.id,
          acceptedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      currentRole: role,
      maxTeamMembers: tenant.plan.maxTeamMembers,
      planName: tenant.plan.name,
      members: members.map((m) => ({
        id: m.id,
        role: m.role,
        createdAt: m.createdAt,
        user: m.user,
      })),
      invitations,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error cargando equipo" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await context.params;
    const { tenant } = await requireTenantRole(tenantSlug, ["OWNER", "ADMIN"]);
    const body = await request.json();

    const email = String(body.email || "").toLowerCase().trim();
    const role = (String(body.role || "AGENT").toUpperCase() as TenantRole);

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Correo inválido" }, { status: 400 });
    }
    if (!["ADMIN", "AGENT"].includes(role)) {
      return NextResponse.json({ error: "Rol inválido (usa ADMIN o AGENT)" }, { status: 400 });
    }

    const entitlement = await canInviteMember(tenant.id, tenant.plan);
    if (!entitlement.allowed) {
      return NextResponse.json({ error: entitlement.reason }, { status: 403 });
    }

    const existingMember = await prisma.tenantMembership.findFirst({
      where: {
        tenantId: tenant.id,
        user: { email },
      },
    });
    if (existingMember) {
      return NextResponse.json(
        { error: "Ese usuario ya pertenece a este workspace." },
        { status: 409 }
      );
    }

    const token = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await prisma.tenantInvitation.create({
      data: {
        tenantId: tenant.id,
        email,
        role,
        token,
        expiresAt,
      },
    });

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      `${request.nextUrl.protocol}//${request.nextUrl.host}`;

    return NextResponse.json({
      ok: true,
      invitation,
      inviteUrl: `${appUrl}/invite/${invitation.token}`,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error creando invitación" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await context.params;
    const { tenant } = await requireTenantRole(tenantSlug, ["OWNER", "ADMIN"]);
    const body = await request.json();

    const membershipId = String(body.membershipId || "");
    const role = String(body.role || "").toUpperCase() as TenantRole;

    if (!membershipId || !Object.values(TenantRole).includes(role)) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const target = await prisma.tenantMembership.findFirst({
      where: { id: membershipId, tenantId: tenant.id },
    });
    if (!target) {
      return NextResponse.json({ error: "Miembro no encontrado" }, { status: 404 });
    }

    if (target.role === TenantRole.OWNER && role !== TenantRole.OWNER) {
      const ownersCount = await prisma.tenantMembership.count({
        where: { tenantId: tenant.id, role: TenantRole.OWNER },
      });
      if (ownersCount <= 1) {
        return NextResponse.json(
          { error: "No puedes cambiar el rol del único propietario (OWNER)." },
          { status: 400 }
        );
      }
    }

    await prisma.tenantMembership.update({
      where: { id: target.id },
      data: { role },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error actualizando rol" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await context.params;
    const { tenant } = await requireTenantRole(tenantSlug, ["OWNER", "ADMIN"]);
    const membershipId = request.nextUrl.searchParams.get("membershipId");
    const invitationId = request.nextUrl.searchParams.get("invitationId");

    if (invitationId) {
      await prisma.tenantInvitation.deleteMany({
        where: { id: invitationId, tenantId: tenant.id },
      });
      return NextResponse.json({ ok: true });
    }

    if (membershipId) {
      const target = await prisma.tenantMembership.findFirst({
        where: { id: membershipId, tenantId: tenant.id },
      });
      if (!target) {
        return NextResponse.json({ error: "Miembro no encontrado" }, { status: 404 });
      }
      if (target.role === TenantRole.OWNER) {
        const ownersCount = await prisma.tenantMembership.count({
          where: { tenantId: tenant.id, role: TenantRole.OWNER },
        });
        if (ownersCount <= 1) {
          return NextResponse.json(
            { error: "No puedes eliminar al único propietario del workspace." },
            { status: 400 }
          );
        }
      }
      await prisma.tenantMembership.delete({ where: { id: target.id } });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Parámetro requerido faltante" }, { status: 400 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error eliminando miembro" }, { status: 500 });
  }
}
