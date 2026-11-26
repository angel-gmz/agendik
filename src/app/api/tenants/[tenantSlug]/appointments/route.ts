import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireTenantAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  bookAppointment,
  cancelAppointment,
  rescheduleAppointment,
} from "@/lib/scheduling/engine";
import { AppointmentStatus } from "@prisma/client";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await context.params;
    const { tenant } = await requireTenantAccess(tenantSlug);

    const [appointments, services, availabilityRules, exceptions] = await Promise.all([
      prisma.appointment.findMany({
        where: { tenantId: tenant.id },
        include: { contact: true, service: true },
        orderBy: { startsAt: "asc" },
        take: 200,
      }),
      prisma.service.findMany({
        where: { tenantId: tenant.id },
        orderBy: { createdAt: "asc" },
      }),
      prisma.availabilityRule.findMany({
        where: { tenantId: tenant.id },
        orderBy: { dayOfWeek: "asc" },
      }),
      prisma.availabilityException.findMany({
        where: { tenantId: tenant.id },
        orderBy: { date: "asc" },
      }),
    ]);

    return NextResponse.json({
      appointments,
      services,
      availabilityRules,
      exceptions,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error cargando agenda" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await context.params;
    const { tenant } = await requireTenantAccess(tenantSlug);
    const body = await request.json();

    // 1. Create Service
    if (body.kind === "service") {
      const service = await prisma.service.create({
        data: {
          tenantId: tenant.id,
          name: String(body.name || "").trim(),
          description: body.description || undefined,
          durationMinutes: Number(body.durationMinutes || 30),
          priceCents: Math.round(Number(body.price || 0) * 100),
          currency: body.currency || "MXN",
          color: body.color || "#4f46e5",
        },
      });
      return NextResponse.json({ service });
    }

    // 2. Create Availability Exception (blocked date)
    if (body.kind === "exception") {
      const ex = await prisma.availabilityException.upsert({
        where: { tenantId_date: { tenantId: tenant.id, date: body.date } },
        create: {
          tenantId: tenant.id,
          date: body.date,
          isBlocked: Boolean(body.isBlocked ?? true),
          customStartTime: body.customStartTime || null,
          customEndTime: body.customEndTime || null,
          reason: body.reason || "Bloqueo manual",
        },
        update: {
          isBlocked: Boolean(body.isBlocked ?? true),
          customStartTime: body.customStartTime || null,
          customEndTime: body.customEndTime || null,
          reason: body.reason || "Bloqueo manual",
        },
      });
      return NextResponse.json({ exception: ex });
    }

    // 3. Manual Appointment Creation
    let contact = null;
    if (body.contactEmail) {
      contact = await prisma.contact.findFirst({
        where: { tenantId: tenant.id, email: body.contactEmail },
      });
    }
    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          tenantId: tenant.id,
          name: body.contactName || "Cliente",
          email: body.contactEmail || undefined,
          phone: body.contactPhone || undefined,
        },
      });
    }

    const appt = await bookAppointment({
      tenantId: tenant.id,
      contactId: contact.id,
      serviceId: body.serviceId,
      startsAtIso: body.startsAt,
      notes: body.notes,
      contactName: body.contactName,
      contactEmail: body.contactEmail,
      contactPhone: body.contactPhone,
    });

    return NextResponse.json({ appointment: appt });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error creando elemento" },
      { status: 400 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await context.params;
    const { tenant } = await requireTenantAccess(tenantSlug, ["OWNER", "ADMIN"]);
    const body = await request.json();

    if (Array.isArray(body.availabilityRules)) {
      for (const r of body.availabilityRules) {
        await prisma.availabilityRule.upsert({
          where: {
            tenantId_dayOfWeek: { tenantId: tenant.id, dayOfWeek: Number(r.dayOfWeek) },
          },
          create: {
            tenantId: tenant.id,
            dayOfWeek: Number(r.dayOfWeek),
            startTime: String(r.startTime || "09:00"),
            endTime: String(r.endTime || "18:00"),
            isActive: Boolean(r.isActive),
          },
          update: {
            startTime: String(r.startTime || "09:00"),
            endTime: String(r.endTime || "18:00"),
            isActive: Boolean(r.isActive),
          },
        });
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error guardando horarios" }, { status: 500 });
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

    if (body.action === "cancel") {
      const updated = await cancelAppointment({
        tenantId: tenant.id,
        appointmentId: body.appointmentId,
        reason: body.reason || "Cancelada desde el panel",
      });
      return NextResponse.json({ appointment: updated });
    }

    if (body.action === "reschedule") {
      const updated = await rescheduleAppointment({
        tenantId: tenant.id,
        appointmentId: body.appointmentId,
        newStartsAtIso: body.newStartsAt,
      });
      return NextResponse.json({ appointment: updated });
    }

    if (body.status && Object.values(AppointmentStatus).includes(body.status)) {
      await prisma.appointment.updateMany({
        where: { id: body.appointmentId, tenantId: tenant.id },
        data: { status: body.status },
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error actualizando cita" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await context.params;
    const { tenant } = await requireTenantAccess(tenantSlug, ["OWNER", "ADMIN"]);
    const kind = request.nextUrl.searchParams.get("kind");
    const id = request.nextUrl.searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    if (kind === "service") {
      await prisma.service.updateMany({
        where: { id, tenantId: tenant.id },
        data: { isActive: false },
      });
    } else if (kind === "exception") {
      await prisma.availabilityException.deleteMany({ where: { id, tenantId: tenant.id } });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error eliminando" }, { status: 500 });
  }
}
