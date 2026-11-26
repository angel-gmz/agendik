import { generateText, tool } from "ai";
import { z } from "zod";
import { prisma } from "../prisma";
import { resolveAiRuntime } from "./provider";
import { runGeminiToolLoop } from "./gemini-native";
import { searchTenantKnowledge } from "./rag";
import {
  bookAppointment,
  cancelAppointment,
  findContactAppointments,
  getAvailableSlots,
  getNextDaysYMD,
  rescheduleAppointment,
} from "../scheduling/engine";
import { getTenantUsageSummary, recordUsage } from "../usage";
import { dispatchTenantNotification } from "../notifications";
import {
  ChannelType,
  ConversationStatus,
  MessageRole,
  NotificationType,
  SubscriptionStatus,
} from "@prisma/client";

export interface ProcessIncomingMessageInput {
  tenantId: string;
  channel: ChannelType;
  externalThreadId?: string;
  conversationId?: string;
  senderName?: string;
  senderEmail?: string;
  senderPhone?: string;
  externalUserId?: string;
  externalMessageId?: string;
  text: string;
}

export interface ProcessIncomingMessageResult {
  conversationId: string;
  contactId: string;
  replyText: string | null;
  status: ConversationStatus;
  escalated: boolean;
  usedSimulator: boolean;
}

async function resolveOrCreateContactAndConversation(input: ProcessIncomingMessageInput) {
  if (input.conversationId) {
    const existingConv = await prisma.conversation.findFirst({
      where: { id: input.conversationId, tenantId: input.tenantId },
      include: { contact: true },
    });
    if (existingConv) {
      return { conversation: existingConv, contact: existingConv.contact };
    }
  }

  if (input.externalThreadId) {
    const existingByThread = await prisma.conversation.findFirst({
      where: {
        tenantId: input.tenantId,
        externalThreadId: input.externalThreadId,
      },
      include: { contact: true },
    });
    if (existingByThread) {
      return { conversation: existingByThread, contact: existingByThread.contact };
    }
  }

  // Find or create contact
  let contact = null;
  if (input.channel === ChannelType.WHATSAPP && input.externalUserId) {
    contact = await prisma.contact.findFirst({
      where: { tenantId: input.tenantId, whatsappId: input.externalUserId },
    });
  } else if (input.channel === ChannelType.INSTAGRAM && input.externalUserId) {
    contact = await prisma.contact.findFirst({
      where: { tenantId: input.tenantId, instagramId: input.externalUserId },
    });
  } else if (input.channel === ChannelType.MESSENGER && input.externalUserId) {
    contact = await prisma.contact.findFirst({
      where: { tenantId: input.tenantId, messengerId: input.externalUserId },
    });
  } else if (input.senderEmail) {
    contact = await prisma.contact.findFirst({
      where: { tenantId: input.tenantId, email: input.senderEmail },
    });
  }

  if (!contact) {
    contact = await prisma.contact.create({
      data: {
        tenantId: input.tenantId,
        name: input.senderName || (input.channel === ChannelType.WEB ? "Visitante Web" : "Cliente"),
        email: input.senderEmail,
        phone: input.senderPhone,
        whatsappId: input.channel === ChannelType.WHATSAPP ? input.externalUserId : undefined,
        instagramId: input.channel === ChannelType.INSTAGRAM ? input.externalUserId : undefined,
        messengerId: input.channel === ChannelType.MESSENGER ? input.externalUserId : undefined,
      },
    });
  }

  const conversation = await prisma.conversation.create({
    data: {
      tenantId: input.tenantId,
      contactId: contact.id,
      channel: input.channel,
      externalThreadId: input.externalThreadId,
      status: ConversationStatus.AI_ACTIVE,
      lastMessageAt: new Date(),
    },
  });

  return { conversation, contact };
}

/**
 * Deterministic smart fallback when no OpenAI/Google API key is configured.
 * Allows testing FAQs, RAG, scheduling availability, booking, and human handoff out-of-the-box!
 */
async function runLocalSimulator(params: {
  tenantId: string;
  tenantName: string;
  contactId: string;
  conversationId: string;
  userText: string;
  handoffMessage: string;
}): Promise<{ reply: string; escalated: boolean }> {
  const lower = params.userText.toLowerCase();

  // 1. Human handoff intent
  if (
    /\b(humano|asesor|persona|operador|queja|urgencia|hablar con alguien)\b/i.test(lower)
  ) {
    await prisma.conversation.update({
      where: { id: params.conversationId },
      data: {
        status: ConversationStatus.HUMAN_HANDOFF,
        needsHumanAttention: true,
        handoffReason: "Solicitado por el cliente",
      },
    });
    await recordUsage(params.tenantId, { humanHandoffCount: 1 });
    await dispatchTenantNotification({
      tenantId: params.tenantId,
      type: NotificationType.HANDOFF,
      subject: `Conversación escalada a humano — ${params.tenantName}`,
      body: `El cliente escribió: "${params.userText}"\nID de conversación: ${params.conversationId}`,
    });
    return { reply: params.handoffMessage, escalated: true };
  }

  // 2. Scheduling / availability intent
  if (/\b(cita|agendar|horario|disponib|reserv|turno|consulta)\b/i.test(lower)) {
    const services = await prisma.service.findMany({
      where: { tenantId: params.tenantId, isActive: true },
    });
    const days = getNextDaysYMD(3);
    const tomorrow = days[1] || days[0];
    const avail = await getAvailableSlots({
      tenantId: params.tenantId,
      dateStr: tomorrow,
      serviceId: services[0]?.id,
    });

    const serviceList = services
      .map(
        (s) =>
          `• ${s.name} (${s.durationMinutes} min${s.priceCents > 0 ? ` — $${(s.priceCents / 100).toFixed(0)} ${s.currency}` : ""})`
      )
      .join("\n");

    const slotPreview = avail.slots
      .slice(0, 6)
      .map((s) => s.label)
      .join(", ");

    return {
      reply: `¡Claro! Te puedo ayudar con tu cita en ${params.tenantName}.\n\nServicios disponibles:\n${serviceList || "• Consulta General"}\n\nHorarios disponibles para mañana (${tomorrow}): ${slotPreview || "Sin espacios mañana, indícame otra fecha"}.\n\n*(Modo simulador activo: configura tu API Key de OpenAI o Gemini en Configuración del Agente para activar agendamiento conversacional completo con tool-calling).*`,
      escalated: false,
    };
  }

  // 3. Search FAQs + Knowledge Base
  const kb = await searchTenantKnowledge(params.tenantId, params.userText, 3);
  if (kb.faqs.length > 0 && kb.faqs[0]) {
    const top = kb.faqs[0];
    return {
      reply: `${top.answer}\n\n¿Te puedo ayudar con alguna otra duda o deseas agendar una cita?`,
      escalated: false,
    };
  }

  if (kb.chunks.length > 0) {
    return {
      reply: `Esto es lo que encontré en nuestra documentación (${kb.chunks[0].title}):\n\n${kb.chunks[0].content.slice(0, 450)}\n\n¿Deseas que te ayude a agendar una cita o prefieres hablar con un asesor humano?`,
      escalated: false,
    };
  }

  return {
    reply: `Gracias por escribir a ${params.tenantName}. Puedo ayudarte con dudas frecuentes sobre nuestros servicios, horarios y pagos, o revisar disponibilidad para agendar una cita. Si prefieres atención personalizada, dime "hablar con un humano".`,
    escalated: false,
  };
}

export async function processIncomingMessage(
  input: ProcessIncomingMessageInput
): Promise<ProcessIncomingMessageResult> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: input.tenantId },
    include: {
      agentConfig: true,
      services: { where: { isActive: true } },
    },
  });

  if (!tenant) {
    throw new Error("Tenant no encontrado");
  }

  const { conversation, contact } = await resolveOrCreateContactAndConversation(input);

  // Store incoming user message
  await prisma.message.create({
    data: {
      tenantId: tenant.id,
      conversationId: conversation.id,
      role: MessageRole.USER,
      content: input.text,
      externalMessageId: input.externalMessageId,
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date() },
  });

  await recordUsage(tenant.id, { messagesCount: 1 });

  // If human took over or AI is paused, do NOT auto-reply
  if (
    conversation.status === ConversationStatus.HUMAN_HANDOFF ||
    !tenant.agentConfig?.isActive
  ) {
    return {
      conversationId: conversation.id,
      contactId: contact.id,
      replyText: null,
      status: conversation.status,
      escalated: false,
      usedSimulator: false,
    };
  }

  // Subscription status check
  if (
    tenant.subscriptionStatus === SubscriptionStatus.PAST_DUE ||
    tenant.subscriptionStatus === SubscriptionStatus.PAUSED ||
    tenant.subscriptionStatus === SubscriptionStatus.CANCELED
  ) {
    const pausedReply =
      "En este momento nuestro asistente virtual está temporalmente inactivo. Un miembro del equipo te atenderá pronto.";
    await prisma.message.create({
      data: {
        tenantId: tenant.id,
        conversationId: conversation.id,
        role: MessageRole.ASSISTANT,
        content: pausedReply,
      },
    });
    return {
      conversationId: conversation.id,
      contactId: contact.id,
      replyText: pausedReply,
      status: conversation.status,
      escalated: false,
      usedSimulator: true,
    };
  }

  // Quota check
  const usage = await getTenantUsageSummary(tenant.id);
  if (usage.messageLimitReached || usage.tokenLimitReached) {
    const quotaReply =
      "En este momento nuestro asistente virtual alcanzó su límite mensual. Un miembro del equipo te atenderá pronto.";
    await prisma.message.create({
      data: {
        tenantId: tenant.id,
        conversationId: conversation.id,
        role: MessageRole.ASSISTANT,
        content: quotaReply,
      },
    });
    return {
      conversationId: conversation.id,
      contactId: contact.id,
      replyText: quotaReply,
      status: conversation.status,
      escalated: false,
      usedSimulator: true,
    };
  }

  const runtime = resolveAiRuntime(tenant.agentConfig);

  // If no live API key configured, use local simulator
  if (!runtime.isLive || !runtime.languageModel) {
    const sim = await runLocalSimulator({
      tenantId: tenant.id,
      tenantName: tenant.name,
      contactId: contact.id,
      conversationId: conversation.id,
      userText: input.text,
      handoffMessage:
        tenant.agentConfig?.handoffMessage ||
        "Te estoy transfiriendo con un asesor humano del equipo.",
    });

    await prisma.message.create({
      data: {
        tenantId: tenant.id,
        conversationId: conversation.id,
        role: MessageRole.ASSISTANT,
        content: sim.reply,
        provider: runtime.provider,
        model: "local-simulator",
      },
    });

    return {
      conversationId: conversation.id,
      contactId: contact.id,
      replyText: sim.reply,
      status: sim.escalated ? ConversationStatus.HUMAN_HANDOFF : ConversationStatus.AI_ACTIVE,
      escalated: sim.escalated,
      usedSimulator: true,
    };
  }

  // Build context for Live LLM
  const [recentMessages, kbContext] = await Promise.all([
    prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "desc" },
      take: 14,
    }),
    searchTenantKnowledge(tenant.id, input.text, 4),
  ]);

  const orderedHistory = recentMessages
    .reverse()
    .filter((m) => m.role === MessageRole.USER || m.role === MessageRole.ASSISTANT)
    .map((m) => ({
      role: m.role === MessageRole.USER ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));

  const servicesSummary = tenant.services
    .map(
      (s) =>
        `- ID: ${s.id} | Nombre: ${s.name} | Duración: ${s.durationMinutes} min | Precio: ${
          s.priceCents > 0 ? `$${(s.priceCents / 100).toFixed(2)} ${s.currency}` : "Gratis / A cotizar"
        }${s.description ? ` | ${s.description}` : ""}`
    )
    .join("\n");

  const faqContext = kbContext.faqs
    .map((f) => `P: ${f.question}\nR: ${f.answer}`)
    .join("\n\n");

  const docContext = kbContext.chunks
    .map((c) => `[${c.title}]: ${c.content}`)
    .join("\n\n");

  const nowStr = new Date().toLocaleString("es-MX", {
    timeZone: tenant.timezone,
    dateStyle: "full",
    timeStyle: "short",
  });

  const systemPrompt = `${tenant.agentConfig.systemPrompt}

INFORMACIÓN DEL NEGOCIO:
- Nombre: ${tenant.name}
- Zona horaria: ${tenant.timezone}
- Fecha y hora actual: ${nowStr}
- Teléfono: ${tenant.phone || "No especificado"}
- Email: ${tenant.email || "No especificado"}
- Dirección: ${tenant.address || "No especificada"}
- Tono deseado: ${tenant.agentConfig.tone}

DATOS ACTUALES DEL CONTACTO:
- Nombre: ${contact.name || "Desconocido"}
- Email: ${contact.email || "Desconocido"}
- Teléfono: ${contact.phone || "Desconocido"}

SERVICIOS DISPONIBLES PARA CITAS:
${servicesSummary || "No hay servicios configurados."}

PREGUNTAS FRECUENTES RELEVANTES:
${faqContext || "Sin FAQs relevantes para esta consulta."}

FRAGMENTOS DE DOCUMENTOS (RAG):
${docContext || "Sin documentos adicionales relevantes."}

REGLAS ESTRICTAS:
1. Responde siempre en español (salvo que el cliente hable otro idioma) de forma clara y concisa.
2. Usa las herramientas disponibles para buscar conocimiento, consultar horarios reales, agendar, reprogramar o cancelar citas.
3. Antes de agendar una cita, asegúrate de tener: servicio, fecha/hora disponible, nombre del cliente y al menos su email o teléfono.
4. Para reprogramar o cancelar una cita existente, primero busca las citas con list_contact_appointments y valida el correo o teléfono del cliente.
5. Si el cliente pide hablar con un humano o si no tienes información suficiente para responder con certeza, llama a escalate_to_human.
6. Nunca inventes precios, políticas ni disponibilidad.`;

  let escalated = false;
  let generatedText = "";
  let tokensInput = 0;
  let tokensOutput = 0;

  if (runtime.provider === "GOOGLE") {
    const geminiResult = await runGeminiToolLoop({
      apiKey: runtime.apiKey,
      model: runtime.modelName,
      systemPrompt,
      history: orderedHistory,
      temperature: tenant.agentConfig.temperature ?? 0.3,
      maxSteps: 5,
      tools: [
        {
          name: "search_knowledge",
          description: "Busca información adicional en las FAQs y documentos del negocio.",
          parameters: {
            type: "OBJECT",
            properties: {
              query: { type: "STRING", description: "Pregunta o palabras clave a buscar" },
            },
            required: ["query"],
          },
        },
        {
          name: "get_available_slots",
          description:
            "Consulta horarios disponibles para agendar una cita en una fecha específica (YYYY-MM-DD).",
          parameters: {
            type: "OBJECT",
            properties: {
              date: { type: "STRING", description: "Fecha en formato YYYY-MM-DD" },
              serviceId: { type: "STRING", description: "ID del servicio seleccionado (opcional)" },
            },
            required: ["date"],
          },
        },
        {
          name: "book_appointment",
          description: "Agenda una nueva cita confirmada en el calendario del negocio.",
          parameters: {
            type: "OBJECT",
            properties: {
              serviceId: { type: "STRING", description: "ID del servicio" },
              startsAtIso: {
                type: "STRING",
                description: "Fecha/hora ISO 8601 devuelta por get_available_slots",
              },
              contactName: { type: "STRING", description: "Nombre completo del cliente" },
              contactEmail: { type: "STRING", description: "Correo electrónico del cliente" },
              contactPhone: { type: "STRING", description: "Teléfono del cliente" },
              notes: { type: "STRING", description: "Notas adicionales" },
            },
            required: ["startsAtIso", "contactName"],
          },
        },
        {
          name: "list_contact_appointments",
          description: "Lista las citas próximas del cliente usando su correo electrónico o teléfono.",
          parameters: {
            type: "OBJECT",
            properties: {
              emailOrPhone: { type: "STRING", description: "Email o teléfono del cliente" },
            },
          },
        },
        {
          name: "reschedule_appointment",
          description: "Reprograma una cita existente a una nueva fecha/hora disponible.",
          parameters: {
            type: "OBJECT",
            properties: {
              appointmentId: { type: "STRING" },
              newStartsAtIso: { type: "STRING" },
              emailOrPhoneVerification: { type: "STRING" },
            },
            required: ["appointmentId", "newStartsAtIso", "emailOrPhoneVerification"],
          },
        },
        {
          name: "cancel_appointment",
          description: "Cancela una cita existente validando correo o teléfono del cliente.",
          parameters: {
            type: "OBJECT",
            properties: {
              appointmentId: { type: "STRING" },
              reason: { type: "STRING" },
              emailOrPhoneVerification: { type: "STRING" },
            },
            required: ["appointmentId", "emailOrPhoneVerification"],
          },
        },
        {
          name: "escalate_to_human",
          description:
            "Transfiere la conversación a un asesor humano cuando el cliente lo solicita o no hay información suficiente.",
          parameters: {
            type: "OBJECT",
            properties: {
              reason: { type: "STRING", description: "Motivo del escalamiento" },
            },
            required: ["reason"],
          },
        },
      ],
      executeTool: async (name, args) => {
        if (name === "search_knowledge") {
          return searchTenantKnowledge(tenant.id, String(args.query || ""), 5);
        }
        if (name === "get_available_slots") {
          return getAvailableSlots({
            tenantId: tenant.id,
            dateStr: String(args.date || ""),
            serviceId: args.serviceId ? String(args.serviceId) : undefined,
          });
        }
        if (name === "book_appointment") {
          try {
            const appt = await bookAppointment({
              tenantId: tenant.id,
              contactId: contact.id,
              conversationId: conversation.id,
              serviceId: args.serviceId ? String(args.serviceId) : undefined,
              startsAtIso: String(args.startsAtIso || ""),
              contactName: String(args.contactName || ""),
              contactEmail: args.contactEmail ? String(args.contactEmail) : undefined,
              contactPhone: args.contactPhone ? String(args.contactPhone) : undefined,
              notes: args.notes ? String(args.notes) : undefined,
            });
            return {
              ok: true,
              appointmentId: appt.id,
              service: appt.service.name,
              startsAt: appt.startsAt.toISOString(),
              status: appt.status,
            };
          } catch (err) {
            return { ok: false, error: err instanceof Error ? err.message : "Error al agendar" };
          }
        }
        if (name === "list_contact_appointments") {
          const appts = await findContactAppointments({
            tenantId: tenant.id,
            contactId: contact.id,
            emailOrPhone: args.emailOrPhone ? String(args.emailOrPhone) : undefined,
          });
          return appts.map((a) => ({
            id: a.id,
            service: a.service.name,
            startsAt: a.startsAt.toISOString(),
            status: a.status,
          }));
        }
        if (name === "reschedule_appointment") {
          try {
            const updated = await rescheduleAppointment({
              tenantId: tenant.id,
              appointmentId: String(args.appointmentId || ""),
              newStartsAtIso: String(args.newStartsAtIso || ""),
              emailOrPhoneVerification: String(args.emailOrPhoneVerification || ""),
            });
            return { ok: true, appointmentId: updated.id, startsAt: updated.startsAt.toISOString() };
          } catch (err) {
            return { ok: false, error: err instanceof Error ? err.message : "Error al reprogramar" };
          }
        }
        if (name === "cancel_appointment") {
          try {
            const updated = await cancelAppointment({
              tenantId: tenant.id,
              appointmentId: String(args.appointmentId || ""),
              reason: args.reason ? String(args.reason) : undefined,
              emailOrPhoneVerification: String(args.emailOrPhoneVerification || ""),
            });
            return { ok: true, appointmentId: updated.id, status: updated.status };
          } catch (err) {
            return { ok: false, error: err instanceof Error ? err.message : "Error al cancelar" };
          }
        }
        if (name === "escalate_to_human") {
          escalated = true;
          const reason = String(args.reason || "Solicitado por el cliente");
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              status: ConversationStatus.HUMAN_HANDOFF,
              needsHumanAttention: true,
              handoffReason: reason,
            },
          });
          await recordUsage(tenant.id, { humanHandoffCount: 1 });
          await dispatchTenantNotification({
            tenantId: tenant.id,
            type: NotificationType.HANDOFF,
            subject: `Asistencia humana requerida — ${tenant.name}`,
            body: `Motivo: ${reason}\nCliente: ${contact.name || "Visitante"}\nÚltimo mensaje: ${input.text}`,
          });
          return { ok: true, handoffMessage: tenant.agentConfig?.handoffMessage };
        }
        return { error: "Herramienta desconocida" };
      },
    });
    generatedText = geminiResult.text;
    tokensInput = geminiResult.tokensInput;
    tokensOutput = geminiResult.tokensOutput;
  } else {
    const result = await generateText({
      model: runtime.languageModel,
      system: systemPrompt,
      messages: orderedHistory,
      temperature: tenant.agentConfig.temperature ?? 0.3,
      maxSteps: 5,
      tools: {
      search_knowledge: tool({
        description: "Busca información adicional en las FAQs y documentos del negocio.",
        parameters: z.object({
          query: z.string().describe("Pregunta o palabras clave a buscar"),
        }),
        execute: async ({ query }) => {
          return searchTenantKnowledge(tenant.id, query, 5);
        },
      }),
      get_available_slots: tool({
        description: "Consulta horarios disponibles para agendar una cita en una fecha específica (YYYY-MM-DD).",
        parameters: z.object({
          date: z.string().describe("Fecha en formato YYYY-MM-DD"),
          serviceId: z.string().optional().describe("ID del servicio seleccionado"),
        }),
        execute: async ({ date, serviceId }) => {
          return getAvailableSlots({ tenantId: tenant.id, dateStr: date, serviceId });
        },
      }),
      book_appointment: tool({
        description: "Agenda una nueva cita confirmada en el calendario del negocio.",
        parameters: z.object({
          serviceId: z.string().optional().describe("ID del servicio"),
          startsAtIso: z.string().describe("Fecha y hora de inicio en formato ISO 8601 devuelto por get_available_slots"),
          contactName: z.string().describe("Nombre completo del cliente"),
          contactEmail: z.string().optional().describe("Correo electrónico del cliente"),
          contactPhone: z.string().optional().describe("Teléfono del cliente"),
          notes: z.string().optional().describe("Notas adicionales de la cita"),
        }),
        execute: async (args) => {
          try {
            const appt = await bookAppointment({
              tenantId: tenant.id,
              contactId: contact.id,
              conversationId: conversation.id,
              ...args,
            });
            return {
              ok: true,
              appointmentId: appt.id,
              service: appt.service.name,
              startsAt: appt.startsAt.toISOString(),
              status: appt.status,
            };
          } catch (err) {
            return {
              ok: false,
              error: err instanceof Error ? err.message : "No se pudo agendar la cita",
            };
          }
        },
      }),
      list_contact_appointments: tool({
        description: "Lista las citas próximas del cliente usando su correo electrónico o teléfono.",
        parameters: z.object({
          emailOrPhone: z.string().optional().describe("Email o teléfono del cliente"),
        }),
        execute: async ({ emailOrPhone }) => {
          const appts = await findContactAppointments({
            tenantId: tenant.id,
            contactId: contact.id,
            emailOrPhone,
          });
          return appts.map((a) => ({
            id: a.id,
            service: a.service.name,
            startsAt: a.startsAt.toISOString(),
            status: a.status,
          }));
        },
      }),
      reschedule_appointment: tool({
        description: "Reprograma una cita existente a una nueva fecha/hora disponible.",
        parameters: z.object({
          appointmentId: z.string(),
          newStartsAtIso: z.string(),
          emailOrPhoneVerification: z.string().describe("Email o teléfono del cliente para validar titularidad"),
        }),
        execute: async (args) => {
          try {
            const updated = await rescheduleAppointment({
              tenantId: tenant.id,
              ...args,
            });
            return { ok: true, appointmentId: updated.id, startsAt: updated.startsAt.toISOString() };
          } catch (err) {
            return { ok: false, error: err instanceof Error ? err.message : "Error al reprogramar" };
          }
        },
      }),
      cancel_appointment: tool({
        description: "Cancela una cita existente validando el correo o teléfono del cliente.",
        parameters: z.object({
          appointmentId: z.string(),
          reason: z.string().optional(),
          emailOrPhoneVerification: z.string().describe("Email o teléfono del cliente para validar titularidad"),
        }),
        execute: async (args) => {
          try {
            const updated = await cancelAppointment({
              tenantId: tenant.id,
              ...args,
            });
            return { ok: true, appointmentId: updated.id, status: updated.status };
          } catch (err) {
            return { ok: false, error: err instanceof Error ? err.message : "Error al cancelar" };
          }
        },
      }),
      escalate_to_human: tool({
        description: "Transfiere la conversación a un asesor humano cuando el cliente lo solicita o cuando no se tiene la respuesta.",
        parameters: z.object({
          reason: z.string().describe("Motivo del escalamiento"),
        }),
        execute: async ({ reason }) => {
          escalated = true;
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              status: ConversationStatus.HUMAN_HANDOFF,
              needsHumanAttention: true,
              handoffReason: reason,
            },
          });
          await recordUsage(tenant.id, { humanHandoffCount: 1 });
          await dispatchTenantNotification({
            tenantId: tenant.id,
            type: NotificationType.HANDOFF,
            subject: `Asistencia humana requerida — ${tenant.name}`,
            body: `Motivo: ${reason}\nCliente: ${contact.name || "Visitante"}\nÚltimo mensaje: ${input.text}`,
          });
          return { ok: true, handoffMessage: tenant.agentConfig?.handoffMessage };
        },
      }),
    },
    });
    generatedText = result.text?.trim() || "";
    tokensInput = result.usage?.promptTokens ?? 0;
    tokensOutput = result.usage?.completionTokens ?? 0;
  }

  const replyText =
    generatedText ||
    (escalated
      ? tenant.agentConfig.handoffMessage
      : "Disculpa, ¿podrías darme un poco más de detalle para ayudarte mejor?");

  await prisma.message.create({
    data: {
      tenantId: tenant.id,
      conversationId: conversation.id,
      role: MessageRole.ASSISTANT,
      content: replyText,
      tokensInput,
      tokensOutput,
      provider: runtime.provider,
      model: runtime.modelName,
    },
  });

  await recordUsage(tenant.id, {
    tokensInput,
    tokensOutput,
    aiResolvedCount: escalated ? 0 : 1,
  });

  return {
    conversationId: conversation.id,
    contactId: contact.id,
    replyText,
    status: escalated ? ConversationStatus.HUMAN_HANDOFF : ConversationStatus.AI_ACTIVE,
    escalated,
    usedSimulator: false,
  };
}
