import { NextRequest, NextResponse } from "next/server";
import { PlanCode, SubscriptionStatus } from "@prisma/client";
import { AuthError, requireTenantAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cancelMpSubscription, isMercadoPagoConfigured } from "@/lib/billing/mercadopago";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await context.params;
    const { tenant } = await requireTenantAccess(tenantSlug, ["OWNER", "ADMIN"]);

    const freePlan = await prisma.plan.findUnique({ where: { code: PlanCode.FREE } });
    if (!freePlan) {
      return NextResponse.json({ error: "Plan FREE no encontrado" }, { status: 500 });
    }

    if (
      tenant.mpPreapprovalId &&
      !tenant.mpPreapprovalId.startsWith("mp_sim_") &&
      isMercadoPagoConfigured()
    ) {
      await cancelMpSubscription(tenant.mpPreapprovalId);
    }

    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        planId: freePlan.id,
        mpPreapprovalId: null,
        subscriptionStatus: SubscriptionStatus.CANCELED,
        currentPeriodEnd: null,
      },
    });

    await prisma.billingEvent.create({
      data: {
        tenantId: tenant.id,
        provider: isMercadoPagoConfigured() ? "MERCADOPAGO" : "SIMULATOR",
        eventType: "SUBSCRIPTION_CANCELLED",
        externalId: tenant.mpPreapprovalId,
        planCode: PlanCode.FREE,
        amountCents: 0,
        currency: freePlan.currency,
        status: "PROCESSED",
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Suscripción cancelada. Tu workspace volvió al plan Starter Free.",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error cancelando suscripción" },
      { status: 500 }
    );
  }
}
