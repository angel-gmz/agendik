import nodemailer from "nodemailer";
import { prisma } from "./prisma";
import {
  ChannelType,
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from "@prisma/client";
import { sendWhatsAppTemplate, sendWhatsAppText } from "./integrations/meta";

function parseList(csv: string | null | undefined): string[] {
  if (!csv) return [];
  return csv
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function sendEmailRaw(to: string, subject: string, body: string): Promise<{
  status: NotificationStatus;
  errorMessage?: string;
}> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return { status: NotificationStatus.SIMULATED };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || user,
      to,
      subject,
      text: body,
    });

    return { status: NotificationStatus.SENT };
  } catch (err) {
    return {
      status: NotificationStatus.FAILED,
      errorMessage: err instanceof Error ? err.message : "Error enviando email",
    };
  }
}

export async function sendTransactionalEmail(
  to: string,
  subject: string,
  body: string
): Promise<{
  status: NotificationStatus;
  errorMessage?: string;
}> {
  return sendEmailRaw(to, subject, body);
}

export async function dispatchTenantNotification(params: {
  tenantId: string;
  type: NotificationType;
  subject: string;
  body: string;
  extraEmail?: string | null;
  extraWhatsapp?: string | null;
  whatsappTemplate?: {
    name: string;
    languageCode?: string;
    bodyParams?: string[];
  };
}) {
  const rule = await prisma.notificationRule.findUnique({
    where: { tenantId: params.tenantId },
  });

  if (rule) {
    if (params.type === NotificationType.BOOKING && !rule.notifyOnBooking) return;
    if (params.type === NotificationType.CANCELLATION && !rule.notifyOnCancellation) return;
    if (params.type === NotificationType.HANDOFF && !rule.notifyOnHandoff) return;
    if (params.type === NotificationType.REMINDER && !rule.sendAppointmentReminders) return;
  }

  const emailTargets = new Set<string>(parseList(rule?.emailRecipients));
  if (params.extraEmail) emailTargets.add(params.extraEmail);

  const whatsappTargets = new Set<string>(parseList(rule?.whatsappRecipients));
  if (params.extraWhatsapp) whatsappTargets.add(params.extraWhatsapp);

  for (const recipient of emailTargets) {
    const result = await sendEmailRaw(recipient, params.subject, params.body);
    await prisma.notificationLog.create({
      data: {
        tenantId: params.tenantId,
        type: params.type,
        channel: NotificationChannel.EMAIL,
        recipient,
        subject: params.subject,
        body: params.body,
        status: result.status,
        errorMessage: result.errorMessage,
      },
    });
  }

  if (whatsappTargets.size > 0) {
    const waConn = await prisma.channelConnection.findUnique({
      where: { tenantId_type: { tenantId: params.tenantId, type: ChannelType.WHATSAPP } },
    });

    for (const recipient of whatsappTargets) {
      let status: NotificationStatus = NotificationStatus.SIMULATED;
      let errorMessage: string | undefined;

      if (waConn?.isActive && waConn.phoneNumberId && waConn.accessTokenEncrypted) {
        const res = params.whatsappTemplate
          ? await sendWhatsAppTemplate({
              connection: waConn,
              to: recipient.replace(/[^0-9]/g, ""),
              templateName: params.whatsappTemplate.name,
              languageCode: params.whatsappTemplate.languageCode,
              bodyParams: params.whatsappTemplate.bodyParams,
            })
          : await sendWhatsAppText({
              connection: waConn,
              to: recipient.replace(/[^0-9]/g, ""),
              text: `${params.subject}\n\n${params.body}`,
            });
        status = res.ok ? NotificationStatus.SENT : NotificationStatus.FAILED;
        errorMessage = res.error;
      }

      await prisma.notificationLog.create({
        data: {
          tenantId: params.tenantId,
          type: params.type,
          channel: NotificationChannel.WHATSAPP,
          recipient,
          subject: params.subject,
          body: params.body,
          status,
          errorMessage,
        },
      });
    }
  }
}

export async function processDueAppointmentReminders() {
  const now = new Date();
  const rules = await prisma.notificationRule.findMany({
    where: { sendAppointmentReminders: true },
    include: { tenant: true },
  });

  let sentCount = 0;

  for (const rule of rules) {
    const horizon = new Date(now.getTime() + rule.reminderHoursBefore * 60 * 60 * 1000);
    const dueAppointments = await prisma.appointment.findMany({
      where: {
        tenantId: rule.tenantId,
        status: "CONFIRMED",
        reminderSentAt: null,
        startsAt: {
          gte: now,
          lte: horizon,
        },
      },
      include: {
        contact: true,
        service: true,
      },
    });

    for (const appt of dueAppointments) {
      const dateStr = appt.startsAt.toLocaleString("es-MX", {
        timeZone: rule.tenant.timezone,
        dateStyle: "medium",
        timeStyle: "short",
      });

      const reminderTemplateName = process.env.WHATSAPP_REMINDER_TEMPLATE_NAME?.trim();
      const reminderTemplateLang = process.env.WHATSAPP_REMINDER_TEMPLATE_LANG?.trim() || "es_MX";

      await dispatchTenantNotification({
        tenantId: rule.tenantId,
        type: NotificationType.REMINDER,
        subject: `Recordatorio de cita — ${rule.tenant.name}`,
        body: `Hola ${appt.contact.name || "cliente"}, te recordamos tu cita de "${appt.service.name}" el ${dateStr}. Si necesitas reprogramar o cancelar, escríbenos por el chat.`,
        extraEmail: appt.contact.email,
        extraWhatsapp: appt.contact.phone || appt.contact.whatsappId,
        ...(reminderTemplateName
          ? {
              whatsappTemplate: {
                name: reminderTemplateName,
                languageCode: reminderTemplateLang,
                bodyParams: [
                  appt.contact.name || "cliente",
                  appt.service.name,
                  dateStr,
                  rule.tenant.name,
                ],
              },
            }
          : {}),
      });

      await prisma.appointment.update({
        where: { id: appt.id },
        data: { reminderSentAt: new Date() },
      });

      sentCount++;
    }
  }

  return { sentCount };
}
