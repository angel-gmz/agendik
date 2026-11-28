import { NextRequest, NextResponse } from "next/server";
import { SubscriptionStatus } from "@prisma/client";
import { AuthError, requireTenantAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cancelMpSubscription, isMercadoPagoConfigured } from "@/lib/billing/mercadopago";
import { sendTransactionalEmail } from "@/lib/notifications";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await context.params;
    const { tenant } = await requireTenantAccess(tenantSlug, ["OWNER", "ADMIN"]);

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
        mpPreapprovalId: null,
        subscriptionStatus: SubscriptionStatus.CANCELED,
        currentPeriodEnd: null,
        trialEndsAt: null,
      },
    });

    await prisma.billingEvent.create({
      data: {
        tenantId: tenant.id,
        provider: isMercadoPagoConfigured() ? "MERCADOPAGO" : "SIMULATOR",
        eventType: "SUBSCRIPTION_CANCELLED",
        externalId: tenant.mpPreapprovalId,
        planCode: tenant.plan.code,
        amountCents: 0,
        currency: tenant.plan.currency,
        status: "PROCESSED",
      },
    });

    const notifyEmail = tenant.mpPayerEmail || tenant.email;
    if (notifyEmail) {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        await sendTransactionalEmail(
          notifyEmail,
          `Suscripción cancelada en Atendik — ${tenant.name}`,
          `Hola,\n\nConfirmamos que tu suscripción de "${tenant.name}" fue cancelada. Puedes reactivar un plan cuando quieras en: ${appUrl}/dashboard/${tenant.slug}/billing`
        );
      } catch {
        // Non-fatal
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Suscripción cancelada. Puedes reactivar cualquier plan cuando quieras.",
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
