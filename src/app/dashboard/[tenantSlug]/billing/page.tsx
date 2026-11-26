"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  CreditCard,
  Check,
  Sparkles,
  Loader2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Receipt,
  XCircle,
} from "lucide-react";

interface PlanItem {
  id: string;
  code: "FREE" | "PRO" | "ENTERPRISE";
  name: string;
  description: string | null;
  priceMonthlyCents: number;
  currency: string;
  monthlyMessageLimit: number;
  monthlyTokenLimit: number;
  maxChannels: number;
  maxKnowledgeDocs: number;
  maxTeamMembers: number;
  allowByok: boolean;
  allowGoogleCalendar: boolean;
}

interface BillingEventItem {
  id: string;
  provider: string;
  eventType: string;
  planCode: string | null;
  amountCents: number;
  currency: string;
  status: string;
  createdAt: string;
}

interface BillingData {
  mpConfigured: boolean;
  subscription: {
    status: string;
    mpPreapprovalId: string | null;
    mpPayerEmail: string | null;
    currentPeriodEnd: string | null;
  };
  currentPlan: PlanItem;
  usage: {
    month: string;
    messagesCount: number;
    totalTokens: number;
    appointmentsCreated: number;
    activeChannels: number;
    knowledgeDocs: number;
    teamMembers: number;
  };
  plans: PlanItem[];
  events: BillingEventItem[];
}

function formatPrice(cents: number, currency = "MXN") {
  if (cents === 0) return "Gratis";
  return `$${(cents / 100).toLocaleString("es-MX")} ${currency}/mes`;
}

export default function BillingPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const searchParams = useSearchParams();
  const mpReturned = searchParams.get("mp_status") === "returned";

  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [payerEmail, setPayerEmail] = useState("");
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; text: string } | null>(
    mpReturned
      ? {
          type: "ok",
          text: "Regresaste de Mercado Pago. Tu suscripción se activará automáticamente en cuanto recibamos la confirmación del webhook.",
        }
      : null
  );

  const loadBilling = useCallback(async () => {
    const res = await fetch(`/api/tenants/${tenantSlug}/billing`);
    if (res.ok) {
      const json: BillingData = await res.json();
      setData(json);
      if (json.subscription.mpPayerEmail && !payerEmail) {
        setPayerEmail(json.subscription.mpPayerEmail);
      }
    }
    setLoading(false);
  }, [tenantSlug, payerEmail]);

  useEffect(() => {
    loadBilling();
  }, [loadBilling]);

  async function handleSelectPlan(planCode: string) {
    setBusyPlan(planCode);
    setFeedback(null);
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/billing/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planCode, payerEmail: payerEmail.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFeedback({ type: "error", text: json.error || "No se pudo cambiar el plan." });
        return;
      }

      if (json.mode === "MERCADOPAGO" && json.checkoutUrl) {
        window.location.href = json.checkoutUrl;
        return;
      }

      setFeedback({ type: "ok", text: json.message || "Plan actualizado correctamente." });
      await loadBilling();
    } catch {
      setFeedback({ type: "error", text: "Error de red procesando el cambio de plan." });
    } finally {
      setBusyPlan(null);
    }
  }

  async function handleCancelSubscription() {
    if (!confirm("¿Seguro que deseas cancelar tu suscripción y volver al plan Starter Free?")) {
      return;
    }
    setCanceling(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/billing/cancel`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        setFeedback({ type: "error", text: json.error || "Error al cancelar." });
      } else {
        setFeedback({ type: "ok", text: json.message || "Suscripción cancelada." });
        await loadBilling();
      }
    } finally {
      setCanceling(false);
    }
  }

  if (loading || !data) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const meters = [
    {
      label: "Mensajes este mes",
      used: data.usage.messagesCount,
      limit: data.currentPlan.monthlyMessageLimit,
      color: "bg-indigo-600",
    },
    {
      label: "Tokens IA consumidos",
      used: data.usage.totalTokens,
      limit: data.currentPlan.monthlyTokenLimit,
      color: "bg-emerald-500",
    },
    {
      label: "Documentos RAG",
      used: data.usage.knowledgeDocs,
      limit: data.currentPlan.maxKnowledgeDocs,
      color: "bg-sky-500",
    },
    {
      label: "Canales activos",
      used: data.usage.activeChannels,
      limit: data.currentPlan.maxChannels,
      color: "bg-violet-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Plan y Facturación</h1>
          <p className="text-sm text-slate-500">
            Administra tu suscripción recurrente con Mercado Pago y revisa tus cuotas mensuales
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3.5 py-1.5 text-xs font-semibold text-sky-800">
          <ShieldCheck className="h-4 w-4 text-sky-600" />
          Pagos procesados con Mercado Pago
        </div>
      </div>

      {!data.mpConfigured && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <strong>Modo simulador de Mercado Pago activo:</strong> No se detectó{" "}
            <code className="font-mono">MP_ACCESS_TOKEN</code> en <code className="font-mono">.env</code>.
            Los cambios de plan se aplicarán instantáneamente en local para pruebas. Para cobrar en
            producción/sandbox, agrega <code className="font-mono">MP_ACCESS_TOKEN</code> y configura
            el webhook en Mercado Pago apuntando a{" "}
            <code className="font-mono font-semibold">{appUrl}/api/webhooks/mercadopago</code>.
          </div>
        </div>
      )}

      {feedback && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            feedback.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Current Subscription Summary & Usage */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">{data.currentPlan.name}</h2>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                  {data.subscription.status}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {formatPrice(data.currentPlan.priceMonthlyCents, data.currentPlan.currency)}
                {data.subscription.currentPeriodEnd && (
                  <>
                    {" "}
                    · Próxima renovación:{" "}
                    {new Date(data.subscription.currentPeriodEnd).toLocaleDateString("es-MX", {
                      dateStyle: "medium",
                    })}
                  </>
                )}
              </p>
            </div>
          </div>

          {data.currentPlan.code !== "FREE" && (
            <button
              type="button"
              onClick={handleCancelSubscription}
              disabled={canceling}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" />
              {canceling ? "Cancelando..." : "Cancelar suscripción"}
            </button>
          )}
        </div>

        {/* Usage meters */}
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {meters.map((m) => {
            const pct = Math.min(100, Math.round((m.used / Math.max(1, m.limit)) * 100));
            return (
              <div key={m.label}>
                <div className="mb-1.5 flex justify-between text-xs font-medium text-slate-600">
                  <span>{m.label}</span>
                  <span>
                    {m.used.toLocaleString()} / {m.limit.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${pct >= 90 ? "bg-red-500" : m.color}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payer Email for Mercado Pago */}
      {data.mpConfigured && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="mb-1 block text-xs font-semibold text-slate-700">
            Correo de facturación de Mercado Pago
          </label>
          <input
            type="email"
            value={payerEmail}
            onChange={(e) => setPayerEmail(e.target.value)}
            placeholder="tu-correo@negocio.com"
            className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
          <p className="mt-1 text-[11px] text-slate-500">
            Mercado Pago utilizará este correo para asociar tu suscripción recurrente y enviar recibos.
          </p>
        </div>
      )}

      {/* Plans Catalog */}
      <div className="grid gap-5 lg:grid-cols-3">
        {data.plans.map((plan) => {
          const isCurrent = plan.code === data.currentPlan.code;
          const isPro = plan.code === "PRO";
          return (
            <div
              key={plan.id}
              className={`flex flex-col rounded-2xl border p-6 shadow-sm ${
                isPro
                  ? "border-indigo-500 bg-indigo-50/30 ring-1 ring-indigo-500"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">{plan.name}</h3>
                {isPro && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2.5 py-0.5 text-[10px] font-bold text-white">
                    <Sparkles className="h-3 w-3" /> Popular
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-xs text-slate-500">{plan.description}</p>
              <div className="mt-4 text-2xl font-extrabold text-slate-900">
                {formatPrice(plan.priceMonthlyCents, plan.currency)}
              </div>

              <ul className="mt-5 flex-1 space-y-2 text-xs text-slate-700">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" />
                  Hasta {plan.monthlyMessageLimit.toLocaleString()} mensajes/mes
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" />
                  {(plan.monthlyTokenLimit / 1_000_000).toFixed(1)}M tokens IA/mes
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" />
                  Hasta {plan.maxChannels} canales activos
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" />
                  Hasta {plan.maxKnowledgeDocs} documentos RAG
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" />
                  Hasta {plan.maxTeamMembers} miembros de equipo
                </li>
                <li className="flex items-center gap-2">
                  <Check
                    className={`h-4 w-4 ${plan.allowByok ? "text-emerald-600" : "text-slate-300"}`}
                  />
                  <span className={plan.allowByok ? "" : "text-slate-400 line-through"}>
                    BYOK (Tu propia API Key)
                  </span>
                </li>
              </ul>

              <button
                type="button"
                disabled={isCurrent || busyPlan !== null}
                onClick={() => handleSelectPlan(plan.code)}
                className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
                  isCurrent
                    ? "cursor-default border border-slate-200 bg-slate-100 text-slate-500"
                    : isPro
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "bg-slate-900 text-white hover:bg-slate-800"
                } disabled:opacity-60`}
              >
                {busyPlan === plan.code ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Procesando...
                  </>
                ) : isCurrent ? (
                  "Plan actual"
                ) : plan.code === "FREE" ? (
                  "Cambiar a Starter Free"
                ) : data.mpConfigured ? (
                  <>
                    Suscribirme con Mercado Pago <ExternalLink className="h-3.5 w-3.5" />
                  </>
                ) : (
                  `Activar ${plan.name} (Simulador)`
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Billing History */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-900">
          <Receipt className="h-4 w-4 text-indigo-600" /> Historial de Facturación
        </h2>
        {data.events.length === 0 ? (
          <p className="text-xs text-slate-400">Aún no hay movimientos de facturación registrados.</p>
        ) : (
          <div className="space-y-2">
            {data.events.map((ev) => (
              <div
                key={ev.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-xs"
              >
                <div>
                  <span className="font-semibold text-slate-800">{ev.eventType}</span>
                  {ev.planCode && (
                    <span className="ml-2 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
                      {ev.planCode}
                    </span>
                  )}
                  <span className="ml-2 text-slate-400">[{ev.provider}]</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-700">
                    {ev.amountCents > 0
                      ? `$${(ev.amountCents / 100).toLocaleString("es-MX")} ${ev.currency}`
                      : "$0"}
                  </span>
                  <span className="rounded bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    {ev.status}
                  </span>
                  <span className="text-slate-400">
                    {new Date(ev.createdAt).toLocaleDateString("es-MX")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
