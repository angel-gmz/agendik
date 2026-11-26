import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireTenantAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ConversationStatus, MessageRole } from "@prisma/client";
import { dispatchChannelOutbound } from "@/lib/integrations/meta";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ tenantSlug: string; conversationId: string }> }
) {
  try {
    const { tenantSlug, conversationId } = await context.params;
    const { tenant } = await requireTenantAccess(tenantSlug);

    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, tenantId: tenant.id },
      include: {
        contact: {
          include: {
            appointments: {
              include: { service: true },
              orderBy: { startsAt: "desc" },
              take: 10,
            },
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ conversation });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error cargando conversación" }, { status: 500 });
  }
}

/**
 * Send human agent reply and automatically switch conversation to HUMAN_HANDOFF
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ tenantSlug: string; conversationId: string }> }
) {
  try {
    const { tenantSlug, conversationId } = await context.params;
    const { tenant, session } = await requireTenantAccess(tenantSlug);
    const body = await request.json();
    const content = String(body.content || "").trim();

    if (!content) {
      return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });
    }

    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, tenantId: tenant.id },
      include: { contact: true },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
    }

    const message = await prisma.message.create({
      data: {
        tenantId: tenant.id,
        conversationId: conversation.id,
        role: MessageRole.HUMAN_AGENT,
        content,
      },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        status: ConversationStatus.HUMAN_HANDOFF,
        needsHumanAttention: false,
        assignedUserId: session.userId,
        lastMessageAt: new Date(),
      },
    });

    // Forward reply to WhatsApp / IG / Messenger if external channel
    const externalRecipient =
      conversation.contact.whatsappId ||
      conversation.contact.instagramId ||
      conversation.contact.messengerId;

    if (externalRecipient && conversation.channel !== "WEB") {
      const conn = await prisma.channelConnection.findUnique({
        where: { tenantId_type: { tenantId: tenant.id, type: conversation.channel } },
      });
      await dispatchChannelOutbound({
        connection: conn,
        channel: conversation.channel,
        recipientId: externalRecipient,
        text: content,
      });
    }

    return NextResponse.json({ message });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error enviando respuesta" }, { status: 500 });
  }
}

/**
 * Toggle AI_ACTIVE / HUMAN_HANDOFF / RESOLVED
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ tenantSlug: string; conversationId: string }> }
) {
  try {
    const { tenantSlug, conversationId } = await context.params;
    const { tenant, session } = await requireTenantAccess(tenantSlug);
    const body = await request.json();

    const status = body.status as ConversationStatus;
    if (!Object.values(ConversationStatus).includes(status)) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }

    const updated = await prisma.conversation.updateMany({
      where: { id: conversationId, tenantId: tenant.id },
      data: {
        status,
        needsHumanAttention: status === ConversationStatus.HUMAN_HANDOFF ? false : false,
        assignedUserId: status === ConversationStatus.HUMAN_HANDOFF ? session.userId : null,
      },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, status });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error actualizando estado" }, { status: 500 });
  }
}
