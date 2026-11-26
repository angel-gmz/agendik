import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireTenantAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret, maskSecret } from "@/lib/crypto";
import { isGoogleOAuthConfigured } from "@/lib/integrations/google-calendar";
import { canActivateChannel } from "@/lib/billing/entitlements";
import { ChannelType } from "@prisma/client";
import { processIncomingMessage } from "@/lib/ai/agent";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await context.params;
    const { tenant } = await requireTenantAccess(tenantSlug);

    const [channels, googleCalendar, notificationRule, notificationLogs] = await Promise.all([
      prisma.channelConnection.findMany({
        where: { tenantId: tenant.id },
        orderBy: { type: "asc" },
      }),
      prisma.googleCalendarConnection.findUnique({
        where: { tenantId: tenant.id },
      }),
      prisma.notificationRule.findUnique({
        where: { tenantId: tenant.id },
      }),
      prisma.notificationLog.findMany({
        where: { tenantId: tenant.id },
        orderBy: { createdAt: "desc" },
        take: 25,
      }),
    ]);

    return NextResponse.json({
      tenantPrimaryColor: tenant.primaryColor,
      tenantCustomDomain: tenant.customDomain || "",
      planCode: tenant.plan.code,
      channels: channels.map((c) => ({
        id: c.id,
        type: c.type,
        name: c.name,
        isActive: c.isActive,
        externalAccountId: c.externalAccountId || "",
        phoneNumberId: c.phoneNumberId || "",
        pageId: c.pageId || "",
        webhookVerifyToken: c.webhookVerifyToken || "",
        hasAccessToken: Boolean(c.accessTokenEncrypted),
        accessTokenMasked: maskSecret(decryptSecret(c.accessTokenEncrypted)),
        widgetConfigJson: c.widgetConfigJson,
      })),
      googleCalendar: googleCalendar
        ? {
            connected: true,
            googleEmail: googleCalendar.googleEmail,
            calendarId: googleCalendar.calendarId,
            syncEnabled: googleCalendar.syncEnabled,
          }
        : { connected: false },
      googleOAuthConfigured: isGoogleOAuthConfigured(),
      notificationRule,
      notificationLogs,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error cargando canales" }, { status: 500 });
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

    if (body.kind === "widget_config") {
      const quickPrompts = Array.isArray(body.quickPrompts)
        ? body.quickPrompts
            .map((p: unknown) => String(p).trim())
            .filter(Boolean)
            .slice(0, 8)
        : [];
      const allowedOrigins = Array.isArray(body.allowedOrigins)
        ? body.allowedOrigins
            .map((o: unknown) => String(o).trim().toLowerCase())
            .filter(Boolean)
            .slice(0, 20)
        : [];

      const widgetConfigJson = {
        buttonLabel: String(body.buttonLabel || "¿Dudas o citas?").trim().slice(0, 40),
        showServices: Boolean(body.showServices ?? true),
        quickPrompts,
        allowedOrigins,
      };

      await prisma.channelConnection.upsert({
        where: { tenantId_type: { tenantId: tenant.id, type: ChannelType.WEB } },
        create: {
          tenantId: tenant.id,
          type: ChannelType.WEB,
          name: "Widget Web",
          isActive: true,
          widgetConfigJson,
        },
        update: {
          widgetConfigJson,
        },
      });
      return NextResponse.json({ ok: true, widgetConfigJson });
    }

    if (body.kind === "custom_domain") {
      if (tenant.plan.code !== "ENTERPRISE") {
        return NextResponse.json(
          { error: "Los dominios personalizados requieren el plan Enterprise." },
          { status: 403 }
        );
      }
      const raw = String(body.customDomain || "")
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, "")
        .replace(/\/.*$/, "");

      if (raw && !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(raw)) {
        return NextResponse.json({ error: "Formato de dominio inválido" }, { status: 400 });
      }

      if (raw) {
        const conflict = await prisma.tenant.findFirst({
          where: { customDomain: raw, id: { not: tenant.id } },
        });
        if (conflict) {
          return NextResponse.json(
            { error: "Ese dominio personalizado ya está en uso por otro workspace." },
            { status: 409 }
          );
        }
      }

      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { customDomain: raw || null },
      });
      return NextResponse.json({ ok: true, customDomain: raw || "" });
    }

    if (body.kind === "channel") {
      const type = body.type as ChannelType;
      if (!Object.values(ChannelType).includes(type)) {
        return NextResponse.json({ error: "Canal inválido" }, { status: 400 });
      }

      const wantsActive = Boolean(body.isActive ?? true);
      if (wantsActive) {
        const check = await canActivateChannel(tenant.id, tenant.plan, type);
        if (!check.allowed) {
          return NextResponse.json({ error: check.reason }, { status: 403 });
        }
      }

      const tokenUpdate =
        typeof body.accessToken === "string" && body.accessToken.trim()
          ? encryptSecret(body.accessToken.trim())
          : undefined;

      await prisma.channelConnection.upsert({
        where: { tenantId_type: { tenantId: tenant.id, type } },
        create: {
          tenantId: tenant.id,
          type,
          name: body.name || type,
          isActive: Boolean(body.isActive ?? true),
          externalAccountId: body.externalAccountId || null,
          phoneNumberId: body.phoneNumberId || null,
          pageId: body.pageId || null,
          webhookVerifyToken: body.webhookVerifyToken || null,
          accessTokenEncrypted: tokenUpdate ?? null,
        },
        update: {
          name: body.name ?? undefined,
          isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
          externalAccountId: body.externalAccountId ?? undefined,
          phoneNumberId: body.phoneNumberId ?? undefined,
          pageId: body.pageId ?? undefined,
          webhookVerifyToken: body.webhookVerifyToken ?? undefined,
          ...(tokenUpdate ? { accessTokenEncrypted: tokenUpdate } : {}),
        },
      });
      return NextResponse.json({ ok: true });
    }

    if (body.kind === "notifications") {
      await prisma.notificationRule.upsert({
        where: { tenantId: tenant.id },
        create: {
          tenantId: tenant.id,
          notifyOnBooking: Boolean(body.notifyOnBooking ?? true),
          notifyOnCancellation: Boolean(body.notifyOnCancellation ?? true),
          notifyOnHandoff: Boolean(body.notifyOnHandoff ?? true),
          sendAppointmentReminders: Boolean(body.sendAppointmentReminders ?? true),
          reminderHoursBefore: Number(body.reminderHoursBefore ?? 24),
          emailRecipients: String(body.emailRecipients ?? ""),
          whatsappRecipients: String(body.whatsappRecipients ?? ""),
        },
        update: {
          notifyOnBooking: Boolean(body.notifyOnBooking ?? true),
          notifyOnCancellation: Boolean(body.notifyOnCancellation ?? true),
          notifyOnHandoff: Boolean(body.notifyOnHandoff ?? true),
          sendAppointmentReminders: Boolean(body.sendAppointmentReminders ?? true),
          reminderHoursBefore: Number(body.reminderHoursBefore ?? 24),
          emailRecipients: String(body.emailRecipients ?? ""),
          whatsappRecipients: String(body.whatsappRecipients ?? ""),
        },
      });
      return NextResponse.json({ ok: true });
    }

    if (body.kind === "disconnect_google") {
      await prisma.googleCalendarConnection.deleteMany({ where: { tenantId: tenant.id } });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error guardando configuración" }, { status: 500 });
  }
}

/**
 * Simulate an inbound WhatsApp / Instagram / Messenger message for testing without Meta credentials
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await context.params;
    const { tenant } = await requireTenantAccess(tenantSlug);
    const body = await request.json();

    const channel = (body.channel as ChannelType) || ChannelType.WHATSAPP;
    const senderId = String(body.senderId || "5215500001111");
    const senderName = String(body.senderName || "Cliente Simulado");
    const text = String(body.text || "Hola, quiero agendar una cita");

    const result = await processIncomingMessage({
      tenantId: tenant.id,
      channel,
      externalThreadId: `${channel.toLowerCase()}_${senderId}`,
      externalUserId: senderId,
      senderName,
      senderPhone: channel === ChannelType.WHATSAPP ? `+${senderId}` : undefined,
      text,
    });

    return NextResponse.json({ ok: true, result });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error simulando mensaje" }, { status: 500 });
  }
}
