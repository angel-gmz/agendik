import { NextRequest, NextResponse } from "next/server";
import { PlanCode, SubscriptionStatus } from "@prisma/client";
import { AuthError, requireTenantAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  cancelMpSubscription,
  createMpSubscription,
  isMercadoPagoConfigured,
} from "@/lib/billing/mercadopago";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await context.params;
    const { session, tenant } = await requireTenantAccess(tenantSlug, ["OWNER", "ADMIN"]);
    const body = await request.json();
    const targetCode = String(body.planCode || "").toUpperCase() as PlanCode;
    const payerEmail = String(body.payerEmail || tenant.email || session.email || "").trim();

    if (!Object.values(PlanCode).includes(targetCode)) {
      return NextResponse.json({ error: "Plan inválido" }, { status: 400 });
    }

    const targetPlan = await prisma.plan.findUnique({ where: { code: targetCode } });
    if (!targetPlan) {
      return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
    }

    if (tenant.plan.code === targetPlan.code && tenant.subscriptionStatus === SubscriptionStatus.ACTIVE) {
      return NextResponse.json({ error: "Ya cuentas con este plan activo." }, { status: 400 });
    }

    // Free plan (only if priceMonthlyCents === 0)
    if (targetPlan.priceMonthlyCents === 0) {
      if (tenant.mpPreapprovalId && isMercadoPagoConfigured()) {
        try {
          await cancelMpSubscription(tenant.mpPreapprovalId);
        } catch {
          // Proceed even if already cancelled on MP
        }
      }

      await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          planId: targetPlan.id,
          mpPreapprovalId: null,
          subscriptionStatus: SubscriptionStatus.ACTIVE,
          currentPeriodEnd: null,
          trialEndsAt: null,
        },
      });

      await prisma.billingEvent.create({
        data: {
          tenantId: tenant.id,
          provider: isMercadoPagoConfigured() ? "MERCADOPAGO" : "SIMULATOR",
          eventType: "PLAN_UPDATED_DIRECT",
          planCode: targetPlan.code,
          amountCents: 0,
          currency: targetPlan.currency,
          status: "PROCESSED",
        },
      });

      return NextResponse.json({
        ok: true,
        mode: "DIRECT",
        planCode: targetPlan.code,
        message: `Tu workspace cambió al plan ${targetPlan.name}.`,
      });
    }

    // Paid plan: Live Mercado Pago or Local Simulator
    if (isMercadoPagoConfigured()) {
      if (!payerEmail || !payerEmail.includes("@")) {
        return NextResponse.json(
          { error: "Se requiere un correo electrónico válido para crear la suscripción en Mercado Pago." },
          { status: 400 }
        );
      }

      const origin =
        process.env.NEXT_PUBLIC_APP_URL ||
        `${request.nextUrl.protocol}//${request.nextUrl.host}`;
      const backUrl = `${origin}/dashboard/${tenant.slug}/billing?mp_status=returned&plan=${targetPlan.code}`;

      const preapproval = await createMpSubscription({
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        tenantName: tenant.name,
        planCode: targetPlan.code,
        planName: targetPlan.name,
        amountCents: targetPlan.priceMonthlyCents,
        currency: targetPlan.currency,
        payerEmail,
        backUrl,
      });

      await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          mpPayerEmail: payerEmail,
          mpPreapprovalId: preapproval.id,
        },
      });

      await prisma.billingEvent.create({
        data: {
          tenantId: tenant.id,
          provider: "MERCADOPAGO",
          eventType: "SUBSCRIPTION_CREATED",
          externalId: preapproval.id,
          planCode: targetPlan.code,
          amountCents: targetPlan.priceMonthlyCents,
          currency: targetPlan.currency,
          status: "PENDING",
          metadataJson: {
            initPoint: preapproval.init_point || preapproval.sandbox_init_point || null,
          },
        },
      });

      return NextResponse.json({
        ok: true,
        mode: "MERCADOPAGO",
        preapprovalId: preapproval.id,
        checkoutUrl: preapproval.init_point || preapproval.sandbox_init_point,
      });
    }

    // Local Simulator Mode (no MP_ACCESS_TOKEN configured)
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);
    const simId = `mp_sim_${Date.now()}`;

    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        planId: targetPlan.id,
        mpPayerEmail: payerEmail || tenant.email,
        mpPreapprovalId: simId,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: nextMonth,
        trialEndsAt: null,
      },
    });

    await prisma.billingEvent.create({
      data: {
        tenantId: tenant.id,
        provider: "SIMULATOR",
        eventType: "SUBSCRIPTION_AUTHORIZED",
        externalId: simId,
        planCode: targetPlan.code,
        amountCents: targetPlan.priceMonthlyCents,
        currency: targetPlan.currency,
        status: "SIMULATED",
        metadataJson: { note: "Upgrade simulado sin MP_ACCESS_TOKEN" },
      },
    });

    return NextResponse.json({
      ok: true,
      mode: "SIMULATOR",
      planCode: targetPlan.code,
      message: `Plan actualizado a ${targetPlan.name} (modo simulador Mercado Pago).`,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error procesando suscripción" },
      { status: 500 }
    );
  }
}
