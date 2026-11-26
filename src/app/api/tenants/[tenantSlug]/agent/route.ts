import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireTenantAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret, maskSecret } from "@/lib/crypto";
import { canUseByok } from "@/lib/billing/entitlements";
import { AiProvider } from "@prisma/client";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await context.params;
    const { tenant } = await requireTenantAccess(tenantSlug);
    const config = await prisma.agentConfig.findUnique({
      where: { tenantId: tenant.id },
    });

    const hasPlatformOpenAi = Boolean(process.env.OPENAI_API_KEY);
    const hasPlatformGoogle = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
    const byokRaw = decryptSecret(config?.byokApiKeyEncrypted);

    return NextResponse.json({
      tenant: {
        name: tenant.name,
        slug: tenant.slug,
        description: tenant.description || "",
        timezone: tenant.timezone,
        email: tenant.email || "",
        phone: tenant.phone || "",
        website: tenant.website || "",
        address: tenant.address || "",
        primaryColor: tenant.primaryColor,
        allowByok: tenant.plan.allowByok,
      },
      agentConfig: config
        ? {
            agentName: config.agentName,
            systemPrompt: config.systemPrompt,
            tone: config.tone,
            greetingMessage: config.greetingMessage,
            handoffMessage: config.handoffMessage,
            provider: config.provider,
            model: config.model,
            temperature: config.temperature,
            isActive: config.isActive,
            autoEscalateOnUnknown: config.autoEscalateOnUnknown,
            hasByokKey: Boolean(byokRaw),
            byokKeyMasked: maskSecret(byokRaw),
          }
        : null,
      runtimeStatus: {
        hasPlatformOpenAi,
        hasPlatformGoogle,
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error obteniendo configuración" }, { status: 500 });
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

    if (body.tenant) {
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          name: body.tenant.name || tenant.name,
          description: body.tenant.description ?? undefined,
          timezone: body.tenant.timezone || tenant.timezone,
          email: body.tenant.email ?? undefined,
          phone: body.tenant.phone ?? undefined,
          website: body.tenant.website ?? undefined,
          address: body.tenant.address ?? undefined,
          primaryColor: body.tenant.primaryColor || tenant.primaryColor,
        },
      });
    }

    if (body.agentConfig) {
      const ac = body.agentConfig;
      let byokUpdate: string | null | undefined = undefined;
      if (typeof ac.byokApiKey === "string") {
        if (ac.byokApiKey.trim() === "") {
          byokUpdate = null;
        } else {
          const byokCheck = canUseByok(tenant.plan);
          if (!byokCheck.allowed) {
            return NextResponse.json({ error: byokCheck.reason }, { status: 403 });
          }
          byokUpdate = encryptSecret(ac.byokApiKey.trim());
        }
      }

      await prisma.agentConfig.upsert({
        where: { tenantId: tenant.id },
        create: {
          tenantId: tenant.id,
          agentName: ac.agentName || "Asistente Virtual",
          systemPrompt: ac.systemPrompt || "",
          tone: ac.tone || "profesional",
          greetingMessage: ac.greetingMessage || "¡Hola!",
          handoffMessage: ac.handoffMessage || "Te transfiero con un asesor.",
          provider: ac.provider === "GOOGLE" ? AiProvider.GOOGLE : AiProvider.OPENAI,
          model: ac.model || "gpt-4o-mini",
          temperature: Number(ac.temperature ?? 0.3),
          isActive: Boolean(ac.isActive ?? true),
          autoEscalateOnUnknown: Boolean(ac.autoEscalateOnUnknown ?? true),
          byokApiKeyEncrypted: byokUpdate ?? null,
        },
        update: {
          agentName: ac.agentName,
          systemPrompt: ac.systemPrompt,
          tone: ac.tone,
          greetingMessage: ac.greetingMessage,
          handoffMessage: ac.handoffMessage,
          provider: ac.provider === "GOOGLE" ? AiProvider.GOOGLE : AiProvider.OPENAI,
          model: ac.model,
          temperature: Number(ac.temperature ?? 0.3),
          isActive: Boolean(ac.isActive ?? true),
          autoEscalateOnUnknown: Boolean(ac.autoEscalateOnUnknown ?? true),
          ...(byokUpdate !== undefined ? { byokApiKeyEncrypted: byokUpdate } : {}),
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error guardando configuración" }, { status: 500 });
  }
}
