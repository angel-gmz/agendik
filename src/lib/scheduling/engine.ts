import { prisma } from "../prisma";
import { AppointmentStatus, NotificationType } from "@prisma/client";
import {
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  getGoogleBusyIntervals,
  updateGoogleCalendarEvent,
} from "../integrations/google-calendar";
import { dispatchTenantNotification } from "../notifications";
import { recordUsage } from "../usage";

export interface TimeSlot {
  startsAt: string; // ISO string
  endsAt: string;   // ISO string
  label: string;    // e.g. "10:00"
}

function parseTimeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function formatDateYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function getAvailableSlots(params: {
  tenantId: string;
  dateStr: string; // "YYYY-MM-DD"
  serviceId?: string;
}): Promise<{
  date: string;
  service: { id: string; name: string; durationMinutes: number } | null;
  slots: TimeSlot[];
  reason?: string;
}> {
  const service = params.serviceId
    ? await prisma.service.findFirst({
        where: { id: params.serviceId, tenantId: params.tenantId, isActive: true },
      })
    : await prisma.service.findFirst({
        where: { tenantId: params.tenantId, isActive: true },
        orderBy: { createdAt: "asc" },
      });

  if (!service) {
    return { date: params.dateStr, service: null, slots: [], reason: "No hay servicios activos configurados." };
  }

  const [year, month, day] = params.dateStr.split("-").map(Number);
  if (!year || !month || !day) {
    return { date: params.dateStr, service, slots: [], reason: "Formato de fecha inválido. Usa YYYY-MM-DD." };
  }

  const targetDate = new Date(year, month - 1, day, 0, 0, 0, 0);
  const dayOfWeek = targetDate.getDay();

  // Check exception first
  const exception = await prisma.availabilityException.findUnique({
    where: { tenantId_date: { tenantId: params.tenantId, date: params.dateStr } },
  });

  if (exception?.isBlocked) {
    return {
      date: params.dateStr,
      service,
      slots: [],
      reason: exception.reason || "Día bloqueado en la agenda.",
    };
  }

  const rule = await prisma.availabilityRule.findUnique({
    where: { tenantId_dayOfWeek: { tenantId: params.tenantId, dayOfWeek } },
  });

  const startStr = exception?.customStartTime || rule?.startTime;
  const endStr = exception?.customEndTime || rule?.endTime;

  if (!exception && (!rule || !rule.isActive)) {
    return { date: params.dateStr, service, slots: [], reason: "No hay atención este día de la semana." };
  }

  if (!startStr || !endStr) {
    return { date: params.dateStr, service, slots: [], reason: "Horario no configurado." };
  }

  const startMinutes = parseTimeToMinutes(startStr);
  const endMinutes = parseTimeToMinutes(endStr);

  const dayStart = new Date(year, month - 1, day, 0, 0, 0, 0);
  const dayEnd = new Date(year, month - 1, day, 23, 59, 59, 999);

  const [existingAppointments, googleBusy] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        tenantId: params.tenantId,
        status: { in: [AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING] },
        startsAt: { gte: dayStart, lte: dayEnd },
      },
    }),
    getGoogleBusyIntervals(params.tenantId, dayStart, dayEnd),
  ]);

  const busyIntervals: Array<{ start: Date; end: Date }> = [
    ...existingAppointments.map((a) => ({ start: a.startsAt, end: a.endsAt })),
    ...googleBusy,
  ];

  const slots: TimeSlot[] = [];
  const step = Math.min(30, service.durationMinutes);
  const now = new Date();

  for (let m = startMinutes; m + service.durationMinutes <= endMinutes; m += step) {
    const slotStart = new Date(year, month - 1, day, Math.floor(m / 60), m % 60, 0, 0);
    const slotEnd = new Date(slotStart.getTime() + service.durationMinutes * 60 * 1000);

    if (slotStart <= now) continue;

    const overlaps = busyIntervals.some(
      (b) => slotStart < b.end && slotEnd > b.start
    );

    if (!overlaps) {
      const hh = String(slotStart.getHours()).padStart(2, "0");
      const mm = String(slotStart.getMinutes()).padStart(2, "0");
      slots.push({
        startsAt: slotStart.toISOString(),
        endsAt: slotEnd.toISOString(),
        label: `${hh}:${mm}`,
      });
    }
  }

  return {
    date: params.dateStr,
    service: { id: service.id, name: service.name, durationMinutes: service.durationMinutes },
    slots,
  };
}

export async function bookAppointment(params: {
  tenantId: string;
  contactId: string;
  serviceId?: string;
  conversationId?: string;
  startsAtIso: string;
  notes?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
}) {
  const tenant = await prisma.tenant.findUnique({ where: { id: params.tenantId } });
  if (!tenant) throw new Error("Tenant no encontrado");

  const service = params.serviceId
    ? await prisma.service.findFirst({
        where: { id: params.serviceId, tenantId: params.tenantId, isActive: true },
      })
    : await prisma.service.findFirst({
        where: { tenantId: params.tenantId, isActive: true },
      });

  if (!service) throw new Error("Servicio no encontrado");

  const startsAt = new Date(params.startsAtIso);
  if (isNaN(startsAt.getTime())) throw new Error("Fecha/hora inválida");
  const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60 * 1000);

  // Check overlap
  const conflict = await prisma.appointment.findFirst({
    where: {
      tenantId: params.tenantId,
      status: { in: [AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING] },
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
  });

  if (conflict) {
    throw new Error("Ese horario ya fue reservado. Por favor elige otro horario disponible.");
  }

  // Update contact details if provided
  const contact = await prisma.contact.update({
    where: { id: params.contactId },
    data: {
      name: params.contactName || undefined,
      email: params.contactEmail || undefined,
      phone: params.contactPhone || undefined,
    },
  });

  // Sync to Google Calendar if connected
  const googleEventId = await createGoogleCalendarEvent({
    tenantId: params.tenantId,
    summary: `${service.name} — ${contact.name || "Cliente"}`,
    description: `Cita agendada vía Agente IA.\nContacto: ${contact.name || "N/A"}\nEmail: ${contact.email || "N/A"}\nTeléfono: ${contact.phone || "N/A"}\nNotas: ${params.notes || ""}`,
    startsAt,
    endsAt,
    attendeeEmail: contact.email,
  });

  const appointment = await prisma.appointment.create({
    data: {
      tenantId: params.tenantId,
      contactId: contact.id,
      serviceId: service.id,
      conversationId: params.conversationId,
      startsAt,
      endsAt,
      status: AppointmentStatus.CONFIRMED,
      notes: params.notes,
      googleEventId,
    },
    include: {
      service: true,
      contact: true,
    },
  });

  await recordUsage(params.tenantId, { appointmentsCreated: 1 });

  const dateLabel = startsAt.toLocaleString("es-MX", {
    timeZone: tenant.timezone,
    dateStyle: "full",
    timeStyle: "short",
  });

  await dispatchTenantNotification({
    tenantId: params.tenantId,
    type: NotificationType.BOOKING,
    subject: `Nueva cita agendada: ${service.name}`,
    body: `Cliente: ${contact.name || "Sin nombre"}\nEmail: ${contact.email || "N/A"}\nTeléfono: ${contact.phone || "N/A"}\nServicio: ${service.name}\nFecha: ${dateLabel}\nID de cita: ${appointment.id}`,
    extraEmail: contact.email,
  });

  return appointment;
}

export async function findContactAppointments(params: {
  tenantId: string;
  contactId?: string;
  emailOrPhone?: string;
}) {
  const whereContact: Record<string, unknown> = { tenantId: params.tenantId };
  if (params.emailOrPhone) {
    const q = params.emailOrPhone.trim();
    const contacts = await prisma.contact.findMany({
      where: {
        tenantId: params.tenantId,
        OR: [
          { email: { equals: q, mode: "insensitive" } },
          { phone: { contains: q.replace(/\s+/g, "") } },
        ],
      },
      select: { id: true },
    });
    const ids = contacts.map((c) => c.id);
    if (params.contactId && !ids.includes(params.contactId)) ids.push(params.contactId);
    whereContact.contactId = { in: ids };
  } else if (params.contactId) {
    whereContact.contactId = params.contactId;
  }

  return prisma.appointment.findMany({
    where: {
      ...whereContact,
      status: { in: [AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING] },
      startsAt: { gte: new Date() },
    },
    include: { service: true, contact: true },
    orderBy: { startsAt: "asc" },
  });
}

export async function rescheduleAppointment(params: {
  tenantId: string;
  appointmentId: string;
  newStartsAtIso: string;
  emailOrPhoneVerification?: string;
}) {
  const appt = await prisma.appointment.findFirst({
    where: { id: params.appointmentId, tenantId: params.tenantId },
    include: { service: true, contact: true, tenant: true },
  });

  if (!appt) throw new Error("Cita no encontrada.");
  if (appt.status === AppointmentStatus.CANCELLED) {
    throw new Error("No se puede reprogramar una cita cancelada.");
  }

  if (params.emailOrPhoneVerification) {
    const v = params.emailOrPhoneVerification.trim().toLowerCase();
    const matchesEmail = appt.contact.email?.toLowerCase() === v;
    const matchesPhone =
      appt.contact.phone?.replace(/[^0-9]/g, "").endsWith(v.replace(/[^0-9]/g, "")) &&
      v.replace(/[^0-9]/g, "").length >= 7;
    if (!matchesEmail && !matchesPhone) {
      throw new Error("El correo o teléfono no coincide con el titular de la cita.");
    }
  }

  const newStartsAt = new Date(params.newStartsAtIso);
  if (isNaN(newStartsAt.getTime())) throw new Error("Nueva fecha/hora inválida.");
  const newEndsAt = new Date(newStartsAt.getTime() + appt.service.durationMinutes * 60 * 1000);

  const conflict = await prisma.appointment.findFirst({
    where: {
      tenantId: params.tenantId,
      id: { not: appt.id },
      status: { in: [AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING] },
      startsAt: { lt: newEndsAt },
      endsAt: { gt: newStartsAt },
    },
  });

  if (conflict) {
    throw new Error("El nuevo horario ya está ocupado. Elige otro horario.");
  }

  if (appt.googleEventId) {
    await updateGoogleCalendarEvent({
      tenantId: params.tenantId,
      googleEventId: appt.googleEventId,
      startsAt: newStartsAt,
      endsAt: newEndsAt,
    });
  }

  const updated = await prisma.appointment.update({
    where: { id: appt.id },
    data: { startsAt: newStartsAt, endsAt: newEndsAt, reminderSentAt: null },
    include: { service: true, contact: true },
  });

  await dispatchTenantNotification({
    tenantId: params.tenantId,
    type: NotificationType.RESCHEDULE,
    subject: `Cita reprogramada: ${appt.service.name}`,
    body: `La cita de ${appt.contact.name || "cliente"} fue reprogramada para ${newStartsAt.toLocaleString("es-MX", { timeZone: appt.tenant.timezone, dateStyle: "full", timeStyle: "short" })}.`,
    extraEmail: appt.contact.email,
  });

  return updated;
}

export async function cancelAppointment(params: {
  tenantId: string;
  appointmentId: string;
  reason?: string;
  emailOrPhoneVerification?: string;
}) {
  const appt = await prisma.appointment.findFirst({
    where: { id: params.appointmentId, tenantId: params.tenantId },
    include: { service: true, contact: true, tenant: true },
  });

  if (!appt) throw new Error("Cita no encontrada.");

  if (params.emailOrPhoneVerification) {
    const v = params.emailOrPhoneVerification.trim().toLowerCase();
    const matchesEmail = appt.contact.email?.toLowerCase() === v;
    const matchesPhone =
      appt.contact.phone?.replace(/[^0-9]/g, "").endsWith(v.replace(/[^0-9]/g, "")) &&
      v.replace(/[^0-9]/g, "").length >= 7;
    if (!matchesEmail && !matchesPhone) {
      throw new Error("El correo o teléfono no coincide con el titular de la cita.");
    }
  }

  if (appt.googleEventId) {
    await deleteGoogleCalendarEvent(params.tenantId, appt.googleEventId);
  }

  const updated = await prisma.appointment.update({
    where: { id: appt.id },
    data: {
      status: AppointmentStatus.CANCELLED,
      cancellationReason: params.reason || "Cancelada por el cliente",
    },
    include: { service: true, contact: true },
  });

  await dispatchTenantNotification({
    tenantId: params.tenantId,
    type: NotificationType.CANCELLATION,
    subject: `Cita cancelada: ${appt.service.name}`,
    body: `La cita de ${appt.contact.name || "cliente"} (${appt.startsAt.toLocaleString("es-MX", { timeZone: appt.tenant.timezone, dateStyle: "medium", timeStyle: "short" })}) fue cancelada. Motivo: ${params.reason || "No especificado"}.`,
    extraEmail: appt.contact.email,
  });

  return updated;
}

export function getNextDaysYMD(count = 7): string[] {
  const out: string[] = [];
  const base = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    out.push(formatDateYMD(d));
  }
  return out;
}
