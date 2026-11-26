import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { processIncomingMessage } from "@/lib/ai/agent";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { ChannelType } from "@prisma/client";

const messageSchema = z.object({
  text: z.string().min(1).max(4000),
  conversationId: z.string().optional(),
  senderName: z.string().optional(),
  senderEmail: z.string().email().optional().or(z.literal("")),
  senderPhone: z.string().optional(),
});

const patchSchema = z.object({
  conversationId: z.string().min(1),
  name: z.string().max(120).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(40).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  feedback: z.string().max(500).optional(),
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await context.params;
  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug, isActive: true },
    include: {
      agentConfig: true,
      services: { where: { isActive: true }, orderBy: { createdAt: "asc" } },
      channels: { where: { type: ChannelType.WEB } },
    },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  const conversationId = request.nextUrl.searchParams.get("conversationId");
  let messages: Array<{ id: string; role: string; content: string; createdAt: Date }> = [];
  let conversationStatus: string | null = null;
  let contactSummary: { name: string | null; email: string | null; phone: string | null } | null = null;

  if (conversationId) {
    const conv = await prisma.conversation.findFirst({
      where: { id: conversationId, tenantId: tenant.id },
      include: {
        contact: true,
        messages: { orderBy: { createdAt: "asc" }, take: 50 },
      },
    });
    if (conv) {
      conversationStatus = conv.status;
      contactSummary = {
        name: conv.contact.name,
        email: conv.contact.email,
        phone: conv.contact.phone,
      };
      messages = conv.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      }));
    }
  }

  return NextResponse.json({
    tenant: {
      name: tenant.name,
      slug: tenant.slug,
      description: tenant.description,
      primaryColor: tenant.primaryColor,
      timezone: tenant.timezone,
      agentName: tenant.agentConfig?.agentName || "Asistente Virtual",
      greetingMessage:
        tenant.agentConfig?.greetingMessage ||
        `¡Hola! Soy el asistente virtual de ${tenant.name}. ¿En qué puedo ayudarte?`,
      widgetConfig: tenant.channels[0]?.widgetConfigJson ?? {},
      services: tenant.services.map((s) => ({
        id: s.id,
        name: s.name,
        durationMinutes: s.durationMinutes,
        priceCents: s.priceCents,
        currency: s.currency,
      })),
    },
    conversationStatus,
    contact: contactSummary,
    messages,
  });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await context.params;

  const ip = getClientIp(request);
  const rl = await checkRateLimit({
    key: `public_chat:${tenantSlug}:${ip}`,
    limit: 20,
    windowSeconds: 60,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Has enviado demasiados mensajes seguidos. Espera un momento e intenta de nuevo." },
      { status: 429 }
    );
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug, isActive: true },
    include: {
      channels: { where: { type: ChannelType.WEB } },
    },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  const widgetConfig = (tenant.channels[0]?.widgetConfigJson || {}) as {
    allowedOrigins?: string[];
  };
  const origin = request.headers.get("origin")?.toLowerCase();
  const appOrigin = (process.env.NEXT_PUBLIC_APP_URL || "").toLowerCase();
  if (
    origin &&
    Array.isArray(widgetConfig.allowedOrigins) &&
    widgetConfig.allowedOrigins.length > 0 &&
    origin !== appOrigin &&
    !origin.startsWith("http://localhost:") &&
    !widgetConfig.allowedOrigins.includes(origin)
  ) {
    return NextResponse.json(
      { error: "Origen no autorizado para este widget." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const parsed = messageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Mensaje inválido" }, { status: 400 });
    }

    const result = await processIncomingMessage({
      tenantId: tenant.id,
      channel: ChannelType.WEB,
      conversationId: parsed.data.conversationId,
      senderName: parsed.data.senderName,
      senderEmail: parsed.data.senderEmail || undefined,
      senderPhone: parsed.data.senderPhone,
      text: parsed.data.text,
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error procesando mensaje" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await context.params;
  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug, isActive: true },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const conv = await prisma.conversation.findFirst({
      where: { id: parsed.data.conversationId, tenantId: tenant.id },
      include: { contact: true },
    });

    if (!conv) {
      return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
    }

    const contactUpdates: Record<string, string> = {};
    if (parsed.data.name?.trim()) contactUpdates.name = parsed.data.name.trim();
    if (parsed.data.email?.trim()) contactUpdates.email = parsed.data.email.trim();
    if (parsed.data.phone?.trim()) contactUpdates.phone = parsed.data.phone.trim();

    if (parsed.data.rating !== undefined) {
      const noteEntry = `[Valoración chat: ${parsed.data.rating}/5${
        parsed.data.feedback?.trim() ? ` - ${parsed.data.feedback.trim()}` : ""
      }]`;
      contactUpdates.notes = conv.contact.notes
        ? `${conv.contact.notes}\n${noteEntry}`
        : noteEntry;
    }

    if (Object.keys(contactUpdates).length > 0) {
      await prisma.contact.update({
        where: { id: conv.contactId },
        data: contactUpdates,
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error actualizando datos" }, { status: 500 });
  }
}
