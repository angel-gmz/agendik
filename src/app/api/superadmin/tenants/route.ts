import { NextRequest, NextResponse } from "next/server";
import { PlanCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AuthError, requireSuperAdmin } from "@/lib/rbac";

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Blended estimated LLM cost in USD per 1M tokens (~$0.25/1M blended input+output for Flash/4o-mini)
 */
function estimateLlmCostUsd(tokensInput: number, tokensOutput: number): number {
  const inputCost = (tokensInput / 1_000_000) * 0.15;
  const outputCost = (tokensOutput / 1_000_000) * 0.6;
  return Number((inputCost + outputCost).toFixed(4));
}

export async function GET() {
  try {
    await requireSuperAdmin();
    const month = getCurrentMonth();

    const [plans, tenants] = await Promise.all([
      prisma.plan.findMany({ orderBy: { priceMonthlyCents: "asc" } }),
      prisma.tenant.findMany({
        include: {
          plan: true,
          usageRecords: { where: { month } },
          _count: {
            select: {
              memberships: true,
              conversations: true,
              appointments: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    let mrrCents = 0;
    let totalMessagesMonth = 0;
    let totalTokensMonth = 0;
    let estimatedLlmCostUsd = 0;
    const planDistribution: Record<string, number> = {};

    const formattedTenants = tenants.map((t) => {
      const u = t.usageRecords[0];
      const msgCount = u?.messagesCount ?? 0;
      const tokIn = u?.tokensInput ?? 0;
      const tokOut = u?.tokensOutput ?? 0;
      const totalTok = tokIn + tokOut;
      const estCost = estimateLlmCostUsd(tokIn, tokOut);

      if (t.isActive && t.subscriptionStatus === "ACTIVE") {
        mrrCents += t.plan.priceMonthlyCents;
      }
      totalMessagesMonth += msgCount;
      totalTokensMonth += totalTok;
      estimatedLlmCostUsd += estCost;
      planDistribution[t.plan.code] = (planDistribution[t.plan.code] || 0) + 1;

      return {
        id: t.id,
        name: t.name,
        slug: t.slug,
        customDomain: t.customDomain,
        email: t.email,
        isActive: t.isActive,
        subscriptionStatus: t.subscriptionStatus,
        planCode: t.plan.code,
        planName: t.plan.name,
        priceMonthlyCents: t.plan.priceMonthlyCents,
        createdAt: t.createdAt,
        counts: t._count,
        monthUsage: {
          messagesCount: msgCount,
          totalTokens: totalTok,
          estimatedCostUsd: estCost,
        },
      };
    });

    return NextResponse.json({
      month,
      metrics: {
        totalTenants: tenants.length,
        activeTenants: tenants.filter((t) => t.isActive).length,
        mrrCents,
        totalMessagesMonth,
        totalTokensMonth,
        estimatedLlmCostUsd: Number(estimatedLlmCostUsd.toFixed(4)),
        planDistribution,
      },
      plans: plans.map((p) => ({
        code: p.code,
        name: p.name,
        priceMonthlyCents: p.priceMonthlyCents,
      })),
      tenants: formattedTenants,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error cargando SuperAdmin" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireSuperAdmin();
    const body = await request.json();
    const tenantId = String(body.tenantId || "");
    if (!tenantId) {
      return NextResponse.json({ error: "tenantId requerido" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};

    if (typeof body.isActive === "boolean") {
      data.isActive = body.isActive;
    }

    if (typeof body.planCode === "string") {
      const code = body.planCode.toUpperCase() as PlanCode;
      if (!Object.values(PlanCode).includes(code)) {
        return NextResponse.json({ error: "Plan inválido" }, { status: 400 });
      }
      const plan = await prisma.plan.findUnique({ where: { code } });
      if (!plan) {
        return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
      }
      data.planId = plan.id;
      data.subscriptionStatus = "ACTIVE";
    }

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data,
      include: { plan: true },
    });

    return NextResponse.json({ ok: true, tenant: updated });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error actualizando tenant" }, { status: 500 });
  }
}
