import crypto from "crypto";
import { PlanCode, SubscriptionStatus } from "@prisma/client";

const MP_API_BASE = "https://api.mercadopago.com";

export function isMercadoPagoConfigured(): boolean {
  return Boolean(process.env.MP_ACCESS_TOKEN?.trim());
}

export function getMercadoPagoCurrency(): string {
  return (process.env.MP_CURRENCY || "MXN").toUpperCase();
}

export interface MpPreapprovalResponse {
  id: string;
  init_point?: string;
  sandbox_init_point?: string;
  status: string; // pending | authorized | paused | cancelled
  reason?: string;
  external_reference?: string;
  payer_email?: string;
  next_payment_date?: string;
  auto_recurring?: {
    frequency: number;
    frequency_type: string;
    transaction_amount: number;
    currency_id: string;
  };
}

export function mapMpStatusToSubscriptionStatus(mpStatus: string): SubscriptionStatus {
  switch (mpStatus?.toLowerCase()) {
    case "authorized":
      return SubscriptionStatus.ACTIVE;
    case "pending":
      return SubscriptionStatus.TRIALING;
    case "paused":
      return SubscriptionStatus.PAUSED;
    case "cancelled":
    case "canceled":
      return SubscriptionStatus.CANCELED;
    default:
      return SubscriptionStatus.PAST_DUE;
  }
}

export async function createMpSubscription(params: {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  planCode: PlanCode;
  planName: string;
  amountCents: number;
  currency?: string;
  payerEmail: string;
  backUrl: string;
}): Promise<MpPreapprovalResponse> {
  const token = process.env.MP_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new Error("MP_ACCESS_TOKEN no está configurado");
  }

  const currencyId = (params.currency || getMercadoPagoCurrency()).toUpperCase();
  const transactionAmount = Number((params.amountCents / 100).toFixed(2));

  const payload = {
    reason: `AgenteIA — Plan ${params.planName} (${params.tenantName})`,
    external_reference: `${params.tenantId}:${params.planCode}`,
    payer_email: params.payerEmail,
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      transaction_amount: transactionAmount,
      currency_id: currencyId,
    },
    back_url: params.backUrl,
    status: "pending",
  };

  const res = await fetch(`${MP_API_BASE}/preapproval`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    const detail = data?.message || data?.cause?.[0]?.description || `HTTP ${res.status}`;
    throw new Error(`Error creando suscripción en Mercado Pago: ${detail}`);
  }

  return data as MpPreapprovalResponse;
}

export async function getMpSubscription(preapprovalId: string): Promise<MpPreapprovalResponse> {
  const token = process.env.MP_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new Error("MP_ACCESS_TOKEN no está configurado");
  }

  const res = await fetch(`${MP_API_BASE}/preapproval/${encodeURIComponent(preapprovalId)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || `Error consultando preapproval ${preapprovalId}`);
  }

  return data as MpPreapprovalResponse;
}

export interface MpAuthorizedPaymentResponse {
  id: string;
  preapproval_id?: string;
  status: string;
  transaction_amount?: number;
  currency_id?: string;
  external_reference?: string;
}

export async function getMpAuthorizedPayment(
  authorizedPaymentId: string
): Promise<MpAuthorizedPaymentResponse> {
  const token = process.env.MP_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new Error("MP_ACCESS_TOKEN no está configurado");
  }

  const res = await fetch(
    `${MP_API_BASE}/authorized_payments/${encodeURIComponent(authorizedPaymentId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      data?.message || `Error consultando authorized_payment ${authorizedPaymentId}`
    );
  }

  return data as MpAuthorizedPaymentResponse;
}

export async function cancelMpSubscription(preapprovalId: string): Promise<MpPreapprovalResponse> {
  const token = process.env.MP_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new Error("MP_ACCESS_TOKEN no está configurado");
  }

  const res = await fetch(`${MP_API_BASE}/preapproval/${encodeURIComponent(preapprovalId)}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: "cancelled" }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || `Error cancelando suscripción ${preapprovalId}`);
  }

  return data as MpPreapprovalResponse;
}

/**
 * Verifies Mercado Pago webhook signature (x-signature header: "ts=...,v1=...").
 * If MP_WEBHOOK_SECRET is not set, verification is skipped (dev/sandbox).
 */
export function verifyMpWebhookSignature(params: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
}): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET?.trim();
  if (!secret) {
    if (process.env.NODE_ENV === "production" && isMercadoPagoConfigured()) {
      return false;
    }
    return true;
  }
  if (!params.xSignature || !params.dataId) return false;

  const parts = Object.fromEntries(
    params.xSignature.split(",").map((kv) => {
      const [k, v] = kv.trim().split("=");
      return [k, v];
    })
  );

  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${params.dataId.toLowerCase()};request-id:${params.xRequestId || ""};ts:${ts};`;
  const computed = crypto.createHmac("sha256", secret).update(manifest).digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(v1));
  } catch {
    return false;
  }
}

export function parseExternalReference(ref?: string | null): {
  tenantId: string;
  planCode: PlanCode;
} | null {
  if (!ref || !ref.includes(":")) return null;
  const [tenantId, rawCode] = ref.split(":");
  if (!tenantId || !Object.values(PlanCode).includes(rawCode as PlanCode)) {
    return null;
  }
  return { tenantId, planCode: rawCode as PlanCode };
}
