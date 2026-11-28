import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireTenantAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantUsageSummary } from "@/lib/usage";
import {
  getSubscriptionAccessStatus,
  getTenantResourceCounts,
} from "@/lib/billing/entitlements";
import { isMercadoPagoConfigured } from "@/lib/billing/mercadopago";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await context.params;
    const { tenant } = await requireTenantAccess(tenantSlug);

    const [usage, resources, plans, events] = await Promise.all([
      getTenantUsageSummary(tenant.id),
      getTenantResourceCounts(tenant.id),
      prisma.plan.findMany({ orderBy: { priceMonthlyCents: "asc" } }),
      prisma.billingEvent.findMany({
        where: { tenantId: tenant.id },
        orderBy: { createdAt: "desc" },
        take: 15,
      }),
    ]);

    const access = getSubscriptionAccessStatus(tenant);

    return NextResponse.json({
      mpConfigured: isMercadoPagoConfigured(),
      subscription: {
        status: tenant.subscriptionStatus,
        mpPreapprovalId: tenant.mpPreapprovalId,
        mpPayerEmail: tenant.mpPayerEmail,
        currentPeriodEnd: tenant.currentPeriodEnd,
        trialEndsAt: tenant.trialEndsAt,
        ...access,
      },
      currentPlan: tenant.plan,
      usage: {
        month: usage.month,
        messagesCount: usage.messagesCount,
        totalTokens: usage.totalTokens,
        appointmentsCreated: usage.appointmentsCreated,
        activeChannels: resources.activeChannels,
        knowledgeDocs: resources.knowledgeDocs,
        teamMembers: resources.teamMembers,
      },
      plans,
      events,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error cargando facturación" }, { status: 500 });
  }
}
