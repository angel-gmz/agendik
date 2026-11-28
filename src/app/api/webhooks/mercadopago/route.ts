import { NextRequest, NextResponse } from "next/server";
import { SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendTransactionalEmail } from "@/lib/notifications";
import {
  getMpAuthorizedPayment,
  getMpSubscription,
  isMercadoPagoConfigured,
  mapMpStatusToSubscriptionStatus,
  parseExternalReference,
  verifyMpWebhookSignature,
} from "@/lib/billing/mercadopago";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const url = request.nextUrl;

    const topic = String(body.type || body.topic || url.searchParams.get("type") || url.searchParams.get("topic") || "");
    const dataId = String(body?.data?.id || url.searchParams.get("data.id") || url.searchParams.get("id") || "");

    const signatureValid = verifyMpWebhookSignature({
      xSignature: request.headers.get("x-signature"),
      xRequestId: request.headers.get("x-request-id"),
      dataId: dataId || null,
    });

    if (!signatureValid) {
      return NextResponse.json({ error: "Firma de webhook inválida" }, { status: 401 });
    }

    if (!dataId) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    if (
      topic.includes("preapproval") ||
      topic === "subscription_preapproval" ||
      topic === "subscription_authorized_payment"
    ) {
      if (!isMercadoPagoConfigured()) {
        return NextResponse.json({ ok: true, simulated: true });
      }

      let preapprovalId = dataId;
      let authorizedPaymentStatus: string | null = null;

      if (topic === "subscription_authorized_payment") {
        const authorizedPayment = await getMpAuthorizedPayment(dataId);
        authorizedPaymentStatus = authorizedPayment.status || null;
        if (!authorizedPayment.preapproval_id) {
          return NextResponse.json({
            ok: true,
            ignored: "authorized_payment sin preapproval_id",
          });
        }
        preapprovalId = authorizedPayment.preapproval_id;
      }

      const preapproval = await getMpSubscription(preapprovalId);
      const parsedRef = parseExternalReference(preapproval.external_reference);
      if (!parsedRef) {
        return NextResponse.json({ ok: true, ignored: "external_reference inválido" });
      }

      const [tenant, targetPlan] = await Promise.all([
        prisma.tenant.findUnique({ where: { id: parsedRef.tenantId } }),
        prisma.plan.findUnique({ where: { code: parsedRef.planCode } }),
      ]);

      if (!tenant || !targetPlan) {
        return NextResponse.json({ ok: true, ignored: "tenant o plan no encontrado" });
      }

      const mappedStatus = mapMpStatusToSubscriptionStatus(preapproval.status);
      const nextPeriodEnd = preapproval.next_payment_date
        ? new Date(preapproval.next_payment_date)
        : mappedStatus === SubscriptionStatus.ACTIVE
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        : null;

      await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          planId: targetPlan.id,
          mpPreapprovalId: preapproval.id,
          mpPayerEmail: preapproval.payer_email || tenant.mpPayerEmail,
          subscriptionStatus: mappedStatus,
          currentPeriodEnd: nextPeriodEnd,
          ...(mappedStatus === SubscriptionStatus.ACTIVE ? { trialEndsAt: null } : {}),
        },
      });

      await prisma.billingEvent.create({
        data: {
          tenantId: tenant.id,
          provider: "MERCADOPAGO",
          eventType:
            topic === "subscription_authorized_payment"
              ? `MP_PAYMENT_${(authorizedPaymentStatus || preapproval.status).toUpperCase()}`
              : `MP_${preapproval.status.toUpperCase()}`,
          externalId: dataId,
          planCode: targetPlan.code,
          amountCents: Math.round((preapproval.auto_recurring?.transaction_amount ?? 0) * 100),
          currency: preapproval.auto_recurring?.currency_id || targetPlan.currency,
          status: "PROCESSED",
          metadataJson: {
            topic,
            preapprovalId: preapproval.id,
            rawStatus: preapproval.status,
            authorizedPaymentStatus,
          },
        },
      });

      // Notify tenant owner by email on subscription activation or cancellation (non-blocking)
      const notifyEmail = preapproval.payer_email || tenant.mpPayerEmail || tenant.email;
      if (notifyEmail) {
        try {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          if (mappedStatus === SubscriptionStatus.ACTIVE) {
            await sendTransactionalEmail(
              notifyEmail,
              `Tu plan ${targetPlan.name} en Atendik ya está activo`,
              `Hola,\n\nConfirmamos la activación de tu plan ${targetPlan.name} ($${(targetPlan.priceMonthlyCents / 100).toLocaleString("es-MX")} ${targetPlan.currency}/mes) para "${tenant.name}".\n\nPuedes administrar tu facturación aquí: ${appUrl}/dashboard/${tenant.slug}/billing`
            );
          } else if (mappedStatus === SubscriptionStatus.CANCELED) {
            await sendTransactionalEmail(
              notifyEmail,
              `Tu suscripción en Atendik fue cancelada — ${tenant.name}`,
              `Hola,\n\nConfirmamos la cancelación de la suscripción de "${tenant.name}" en Atendik. Puedes reactivar cualquier plan cuando quieras desde tu panel: ${appUrl}/dashboard/${tenant.slug}/billing`
            );
          }
        } catch {
          // Non-fatal if email delivery fails
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error procesando webhook Mercado Pago" },
      { status: 500 }
    );
  }
}
