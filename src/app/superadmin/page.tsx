"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Building2,
  DollarSign,
  Cpu,
  MessageSquare,
  Loader2,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";

interface SuperAdminTenant {
  id: string;
  name: string;
  slug: string;
  customDomain: string | null;
  email: string | null;
  isActive: boolean;
  subscriptionStatus: string;
  planCode: string;
  planName: string;
  priceMonthlyCents: number;
  counts: {
    memberships: number;
    conversations: number;
    appointments: number;
  };
  monthUsage: {
    messagesCount: number;
    totalTokens: number;
    estimatedCostUsd: number;
  };
}

interface SuperAdminData {
  month: string;
  metrics: {
    totalTenants: number;
    activeTenants: number;
    mrrCents: number;
    totalMessagesMonth: number;
    totalTokensMonth: number;
    estimatedLlmCostUsd: number;
    planDistribution: Record<string, number>;
  };
  plans: Array<{ code: string; name: string; priceMonthlyCents: number }>;
  tenants: SuperAdminTenant[];
}

export default function SuperAdminPage() {
  const [data, setData] = useState<SuperAdminData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const loadData = useCallback(async () => {
    const res = await fetch("/api/superadmin/tenants");
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Acceso denegado.");
    } else {
      setData(json);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function updateTenant(tenantId: string, patch: { isActive?: boolean; planCode?: string }) {
    setMsg("");
    const res = await fetch("/api/superadmin/tenants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId, ...patch }),
    });
    if (res.ok) {
      setMsg("Workspace actualizado correctamente.");
      loadData();
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <ShieldAlert className="h-10 w-10 text-red-500" />
        <h1 className="mt-3 text-xl font-bold text-slate-900">Acceso restringido</h1>
        <p className="mt-1 text-sm text-slate-600">{error || "Solo usuarios SuperAdmin."}</p>
        <Link
          href="/login"
          className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Ir a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-600">
              <ShieldAlert className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-wider">SuperAdmin SaaS</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              Control Global de Plataforma ({data.month})
            </h1>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Volver al inicio
          </Link>
        </div>

        {msg && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
            {msg}
          </div>
        )}

        {/* Global KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-500">
              <span>Tenants</span>
              <Building2 className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-900">
              {data.metrics.activeTenants} / {data.metrics.totalTenants}
            </div>
            <div className="mt-1 text-xs text-slate-500">Activos / totales</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-500">
              <span>MRR Estimado</span>
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-900">
              ${(data.metrics.mrrCents / 100).toLocaleString("es-MX")} MXN
            </div>
            <div className="mt-1 text-xs text-slate-500">Suscripciones activas</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-500">
              <span>Mensajes del mes</span>
              <MessageSquare className="h-4 w-4 text-sky-600" />
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-900">
              {data.metrics.totalMessagesMonth.toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {data.metrics.totalTokensMonth.toLocaleString()} tokens
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-500">
              <span>Costo LLM estimado</span>
              <Cpu className="h-4 w-4 text-violet-600" />
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-900">
              ${data.metrics.estimatedLlmCostUsd.toFixed(4)} USD
            </div>
            <div className="mt-1 text-xs text-slate-500">Consumo global {data.month}</div>
          </div>
        </div>

        {/* Tenants table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Workspace</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Uso ({data.month})</th>
                <th className="px-4 py-3">Costo IA</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.tenants.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{t.name}</div>
                    <div className="font-mono text-xs text-slate-500">
                      {t.slug}
                      {t.customDomain ? ` · ${t.customDomain}` : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={t.planCode}
                      onChange={(e) => updateTenant(t.id, { planCode: e.target.value })}
                      className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold"
                    >
                      {data.plans.map((p) => (
                        <option key={p.code} value={p.code}>
                          {p.code}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    <div>{t.monthUsage.messagesCount.toLocaleString()} msgs</div>
                    <div className="text-slate-400">
                      {t.monthUsage.totalTokens.toLocaleString()} tok · {t.counts.conversations} chats
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">
                    ${t.monthUsage.estimatedCostUsd.toFixed(4)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        t.isActive
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {t.isActive ? "Activo" : "Suspendido"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateTenant(t.id, { isActive: !t.isActive })}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                          t.isActive
                            ? "border border-red-200 text-red-600 hover:bg-red-50"
                            : "bg-emerald-600 text-white hover:bg-emerald-700"
                        }`}
                      >
                        {t.isActive ? "Suspender" : "Reactivar"}
                      </button>
                      <Link
                        href={`/dashboard/${t.slug}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Panel <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
