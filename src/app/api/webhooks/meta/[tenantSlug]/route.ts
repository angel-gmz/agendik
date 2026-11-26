import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  dispatchChannelOutbound,
  parseMetaWebhookPayload,
} from "@/lib/integrations/meta";
import { processIncomingMessage } from "@/lib/ai/agent";

function verifyMetaSignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.META_APP_SECRET?.trim();
  if (!appSecret) {
    return process.env.NODE_ENV !== "production";
  }
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
    return false;
  }
  const provided = signatureHeader.slice("sha256=".length).trim();
  const expected = crypto.createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  try {
    const providedBuf = Buffer.from(provided, "hex");
    const expectedBuf = Buffer.from(expected, "hex");
    if (providedBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(providedBuf, expectedBuf);
  } catch {
    return false;
  }
}

/**
 * Meta Webhook Verification (GET) for WhatsApp Cloud API, Instagram DM & Facebook Messenger
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await context.params;
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    include: { channels: true },
  });

  if (!tenant) {
    return new NextResponse("Tenant not found", { status: 404 });
  }

  const validToken = tenant.channels.some(
    (c) => c.webhookVerifyToken && c.webhookVerifyToken === token
  );

  if (mode === "subscribe" && validToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

/**
 * Meta Inbound Messages Webhook (POST)
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await context.params;
  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug, isActive: true },
    include: { channels: true },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });
  }

  try {
    const rawBody = await request.text();
    const signatureValid = verifyMetaSignature(
      rawBody,
      request.headers.get("x-hub-signature-256")
    );
    if (!signatureValid) {
      return NextResponse.json({ error: "Firma de Meta inválida" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as Record<string, unknown>;
    const normalized = parseMetaWebhookPayload(payload);

    const processed: Array<{
      channel: string;
      conversationId: string;
      replySent: boolean;
    }> = [];

    for (const msg of normalized) {
      const channelConn = tenant.channels.find((c) => c.type === msg.channel) ?? null;

      const result = await processIncomingMessage({
        tenantId: tenant.id,
        channel: msg.channel,
        externalThreadId: msg.externalThreadId,
        externalUserId: msg.externalUserId,
        externalMessageId: msg.externalMessageId,
        senderName: msg.senderName,
        senderPhone: msg.senderPhone,
        text: msg.text,
      });

      let replySent = false;
      if (result.replyText) {
        const out = await dispatchChannelOutbound({
          connection: channelConn,
          channel: msg.channel,
          recipientId: msg.externalUserId,
          text: result.replyText,
        });
        replySent = out.ok;
      }

      processed.push({
        channel: msg.channel,
        conversationId: result.conversationId,
        replySent,
      });
    }

    return NextResponse.json({ ok: true, processed });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error procesando webhook" },
      { status: 500 }
    );
  }
}
