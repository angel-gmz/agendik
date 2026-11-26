import { ChannelConnection, ChannelType } from "@prisma/client";
import { decryptSecret } from "../crypto";

export interface NormalizedInboundMessage {
  channel: ChannelType;
  externalUserId: string;
  externalThreadId: string;
  externalMessageId?: string;
  senderName?: string;
  senderPhone?: string;
  text: string;
}

/**
 * Parses Meta Graph API webhooks for WhatsApp Cloud API, Instagram DM, and Facebook Messenger.
 */
export function parseMetaWebhookPayload(payload: Record<string, unknown>): NormalizedInboundMessage[] {
  const results: NormalizedInboundMessage[] = [];
  const objType = String(payload.object || "");
  const entries = Array.isArray(payload.entry) ? payload.entry : [];

  // 1. WhatsApp Cloud API
  if (objType === "whatsapp_business_account") {
    for (const entry of entries as Array<Record<string, unknown>>) {
      const changes = Array.isArray(entry.changes) ? entry.changes : [];
      for (const change of changes as Array<Record<string, unknown>>) {
        const value = (change.value || {}) as Record<string, unknown>;
        const contacts = Array.isArray(value.contacts)
          ? (value.contacts as Array<Record<string, unknown>>)
          : [];
        const messages = Array.isArray(value.messages)
          ? (value.messages as Array<Record<string, unknown>>)
          : [];

        for (const msg of messages) {
          const textObj = msg.text as Record<string, unknown> | undefined;
          const text = typeof textObj?.body === "string" ? textObj.body.trim() : "";
          const from = String(msg.from || "");
          if (!text || !from) continue;

          const matchedContact = contacts.find((c) => String(c.wa_id || "") === from);
          const profile = matchedContact?.profile as Record<string, unknown> | undefined;

          results.push({
            channel: ChannelType.WHATSAPP,
            externalUserId: from,
            externalThreadId: `wa_${from}`,
            externalMessageId: msg.id ? String(msg.id) : undefined,
            senderName: typeof profile?.name === "string" ? profile.name : undefined,
            senderPhone: `+${from.replace(/^\+/, "")}`,
            text,
          });
        }
      }
    }
    return results;
  }

  // 2. Instagram DM & Facebook Messenger
  if (objType === "instagram" || objType === "page") {
    const channel = objType === "instagram" ? ChannelType.INSTAGRAM : ChannelType.MESSENGER;
    for (const entry of entries as Array<Record<string, unknown>>) {
      const messagingList = Array.isArray(entry.messaging) ? entry.messaging : [];
      for (const event of messagingList as Array<Record<string, unknown>>) {
        const sender = event.sender as Record<string, unknown> | undefined;
        const message = event.message as Record<string, unknown> | undefined;
        if (!sender?.id || !message?.text || message.is_echo) continue;

        const senderId = String(sender.id);
        results.push({
          channel,
          externalUserId: senderId,
          externalThreadId: `${channel.toLowerCase()}_${senderId}`,
          externalMessageId: message.mid ? String(message.mid) : undefined,
          text: String(message.text).trim(),
        });
      }
    }
    return results;
  }

  return results;
}

export async function sendWhatsAppText(params: {
  connection: ChannelConnection;
  to: string;
  text: string;
}): Promise<{ ok: boolean; error?: string }> {
  const token = decryptSecret(params.connection.accessTokenEncrypted);
  const phoneNumberId = params.connection.phoneNumberId;

  if (!token || !phoneNumberId) {
    return { ok: false, error: "WhatsApp accessToken o phoneNumberId no configurados" };
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${encodeURIComponent(phoneNumberId)}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: params.to.replace(/[^0-9]/g, ""),
          type: "text",
          text: { body: params.text },
        }),
      }
    );

    if (!res.ok) {
      return { ok: false, error: await res.text() };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error de red con Meta WhatsApp API",
    };
  }
}

export async function sendWhatsAppTemplate(params: {
  connection: ChannelConnection;
  to: string;
  templateName: string;
  languageCode?: string;
  bodyParams?: string[];
}): Promise<{ ok: boolean; error?: string }> {
  const token = decryptSecret(params.connection.accessTokenEncrypted);
  const phoneNumberId = params.connection.phoneNumberId;

  if (!token || !phoneNumberId) {
    return { ok: false, error: "WhatsApp accessToken o phoneNumberId no configurados" };
  }

  try {
    const components =
      params.bodyParams && params.bodyParams.length > 0
        ? [
            {
              type: "body",
              parameters: params.bodyParams.map((text) => ({
                type: "text",
                text,
              })),
            },
          ]
        : undefined;

    const res = await fetch(
      `https://graph.facebook.com/v21.0/${encodeURIComponent(phoneNumberId)}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: params.to.replace(/[^0-9]/g, ""),
          type: "template",
          template: {
            name: params.templateName,
            language: { code: params.languageCode || "es_MX" },
            ...(components ? { components } : {}),
          },
        }),
      }
    );

    if (!res.ok) {
      return { ok: false, error: await res.text() };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error de red con Meta WhatsApp Template API",
    };
  }
}

export async function sendMetaPageMessage(params: {
  connection: ChannelConnection;
  recipientId: string;
  text: string;
}): Promise<{ ok: boolean; error?: string }> {
  const token = decryptSecret(params.connection.accessTokenEncrypted);
  const pageId = params.connection.pageId || "me";

  if (!token) {
    return { ok: false, error: "Token de página de Meta no configurado" };
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${encodeURIComponent(pageId)}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient: { id: params.recipientId },
          message: { text: params.text },
        }),
      }
    );

    if (!res.ok) {
      return { ok: false, error: await res.text() };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error de red con Meta Send API",
    };
  }
}

export async function dispatchChannelOutbound(params: {
  connection: ChannelConnection | null;
  channel: ChannelType;
  recipientId: string;
  text: string;
}): Promise<{ ok: boolean; simulated?: boolean; error?: string }> {
  if (params.channel === ChannelType.WEB) {
    return { ok: true };
  }

  if (!params.connection || !params.connection.accessTokenEncrypted) {
    return { ok: true, simulated: true };
  }

  if (params.channel === ChannelType.WHATSAPP) {
    return sendWhatsAppText({
      connection: params.connection,
      to: params.recipientId,
      text: params.text,
    });
  }

  return sendMetaPageMessage({
    connection: params.connection,
    recipientId: params.recipientId,
    text: params.text,
  });
}
