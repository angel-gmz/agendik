import { prisma } from "./prisma";
import { ChannelType, PlanCode, SubscriptionStatus, TenantRole } from "@prisma/client";
import crypto from "crypto";
import { INDUSTRY_TEMPLATES } from "./templates/industries";

export const TRIAL_DURATION_DAYS = 14;

export function slugifyTenant(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export { extractSubdomain } from "./subdomain";

export function getTenantSubdomainUrl(slug: string, path = ""): string {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";
  const protocol = rootDomain.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${slug}.${rootDomain}${path}`;
}

export async function createTenantWithDefaults(params: {
  name: string;
  slug: string;
  ownerUserId: string;
  timezone?: string;
  email?: string;
  planCode?: PlanCode;
  industry?: string;
}) {
  const cleanSlug = slugifyTenant(params.slug);
  if (!cleanSlug || cleanSlug.length < 2) {
    throw new Error("El subdominio debe tener al menos 2 caracteres alfanuméricos.");
  }

  const reserved = [
    "www",
    "app",
    "api",
    "admin",
    "superadmin",
    "auth",
    "login",
    "register",
    "dashboard",
    "embed",
    "chat",
    "terms",
    "privacy",
  ];
  if (reserved.includes(cleanSlug)) {
    throw new Error(`El subdominio "${cleanSlug}" está reservado.`);
  }

  const existing = await prisma.tenant.findUnique({ where: { slug: cleanSlug } });
  if (existing) {
    throw new Error(`El subdominio "${cleanSlug}" ya está en uso.`);
  }

  let plan = await prisma.plan.findUnique({
    where: { code: params.planCode ?? PlanCode.PRO },
  });

  if (!plan) {
    plan = await prisma.plan.create({
      data: {
        code: PlanCode.PRO,
        name: "Clínica Pro",
        description:
          "Para clínicas y spas en crecimiento que atienden por WhatsApp, Instagram y Messenger.",
        priceMonthlyCents: 79900,
        currency: "MXN",
        monthlyMessageLimit: 5000,
        monthlyTokenLimit: 5_000_000,
        maxChannels: 4,
        maxKnowledgeDocs: 50,
        maxTeamMembers: 5,
        allowByok: true,
        allowGoogleCalendar: true,
      },
    });
  }

  const template = params.industry ? INDUSTRY_TEMPLATES[params.industry] : undefined;
  const verifyToken = crypto.randomBytes(16).toString("hex");
  const cleanName = params.name.trim();
  const trialEndsAt = new Date(Date.now() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);

  const tenant = await prisma.tenant.create({
    data: {
      name: cleanName,
      slug: cleanSlug,
      description: template?.description ?? null,
      primaryColor: template?.primaryColor ?? "#4f46e5",
      timezone: params.timezone || "America/Mexico_City",
      email: params.email,
      planId: plan.id,
      subscriptionStatus: SubscriptionStatus.TRIALING,
      trialEndsAt,
      memberships: {
        create: {
          userId: params.ownerUserId,
          role: TenantRole.OWNER,
        },
      },
      agentConfig: {
        create: {
          agentName: `Asistente de ${cleanName}`,
          tone: template?.tone ?? "profesional y cercano",
          systemPrompt:
            template?.systemPrompt ??
            "Eres un asistente virtual amable, claro y profesional. Respondes dudas frecuentes usando únicamente la información del negocio y ayudas a consultar disponibilidad, agendar, reprogramar o cancelar citas.",
          greetingMessage: template
            ? template.greetingMessage(cleanName)
            : `¡Hola! Soy el asistente virtual de ${cleanName}. ¿En qué te puedo ayudar hoy? Puedo resolver tus dudas o ayudarte a agendar una cita.`,
          provider: process.env.DEFAULT_AI_PROVIDER === "GOOGLE" ? "GOOGLE" : "OPENAI",
          model:
            process.env.DEFAULT_AI_PROVIDER === "GOOGLE"
              ? process.env.DEFAULT_GOOGLE_MODEL || "gemini-3.1-flash-lite"
              : process.env.DEFAULT_OPENAI_MODEL || "gpt-4o-mini",
        },
      },
      channels: {
        create: [
          {
            type: ChannelType.WEB,
            name: "Widget Web",
            isActive: true,
            widgetConfigJson: {
              buttonLabel: "¿Dudas o citas?",
              showServices: true,
              quickPrompts: template?.quickPrompts ?? [
                "¿Qué horarios tienen?",
                "Quiero agendar una cita",
                "¿Qué servicios ofrecen?",
                "Hablar con un humano",
              ],
              allowedOrigins: [],
            },
          },
          {
            type: ChannelType.WHATSAPP,
            name: "WhatsApp Business",
            isActive: false,
            webhookVerifyToken: verifyToken,
          },
          {
            type: ChannelType.INSTAGRAM,
            name: "Instagram DM",
            isActive: false,
            webhookVerifyToken: verifyToken,
          },
          {
            type: ChannelType.MESSENGER,
            name: "Facebook Messenger",
            isActive: false,
            webhookVerifyToken: verifyToken,
          },
        ],
      },
      services: {
        create: template
          ? template.services.map((s) => ({
              name: s.name,
              description: s.description,
              durationMinutes: s.durationMinutes,
              priceCents: s.priceCents,
              currency: "MXN",
            }))
          : [
              {
                name: "Consulta General",
                description: "Sesión inicial de asesoría o atención personalizada.",
                durationMinutes: 30,
                priceCents: 0,
                currency: "MXN",
              },
            ],
      },
      faqs: template
        ? {
            create: template.faqs.map((f) => ({
              category: f.category,
              question: f.question,
              answer: f.answer,
            })),
          }
        : undefined,
      availabilityRules: {
        create: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
          dayOfWeek,
          startTime: "09:00",
          endTime: "18:00",
          isActive: dayOfWeek >= 1 && dayOfWeek <= 5,
        })),
      },
      notificationRule: {
        create: {
          notifyOnBooking: true,
          notifyOnCancellation: true,
          notifyOnHandoff: true,
          sendAppointmentReminders: true,
          reminderHoursBefore: 24,
          emailRecipients: params.email || "",
        },
      },
    },
    include: {
      plan: true,
    },
  });

  return tenant;
}
