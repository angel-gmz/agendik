"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  MessageSquare,
  CalendarCheck,
  Users,
  Sparkles,
  AlertTriangle,
  Loader2,
  Cpu,
  ArrowRight,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface OverviewData {
  tenant: {
    name: string;
    slug: string;
    timezone: string;
    plan: {
      name: string;
      code: string;
      monthlyMessageLimit: number;
      monthlyTokenLimit: number;
    };
  };
  kpis: {
    totalConversations: number;
    handoffConversations: number;
    resolvedConversations: number;
    upcomingAppointments: number;
    totalContacts: number;
    aiResolutionRate: number;
  };
  usage: {
    month: string;
    messagesCount: number;
    totalTokens: number;
    appointmentsCreated: number;
  };
  onboarding?: {
    hasProfile: boolean;
    hasKnowledge: boolean;
    hasService: boolean;
    hasTestedChat: boolean;
  };
  recentNeedsAttention: Array<{
    id: string;
    channel: string;
    handoffReason: string | null;
    lastMessageAt: string;
    contact: { name: string | null; email: string | null };
    messages: Array<{ content: string }>;
  }>;
  recentAppointments: Array<{
    id: string;
    startsAt: string;
    status: string;
    contact: { name: string | null; email: string | null };
    service: { name: string; durationMinutes: number };
  }>;
}

export default function DashboardOverviewPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(true);

  useEffect(() => {
    fetch(`/api/tenants/${tenantSlug}/overview`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [tenantSlug]);

  if (loading || !data) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const msgPct = Math.min(
    100,
    Math.round((data.usage.messagesCount / data.tenant.plan.monthlyMessageLimit) * 100)
  );
  const tokPct = Math.min(
    100,
    Math.round((data.usage.totalTokens / data.tenant.plan.monthlyTokenLimit) * 100)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{data.tenant.name}</h1>
          <p className="text-sm text-slate-500">
            Subdominio: <span className="font-mono text-indigo-600">{data.tenant.slug}.{process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000"}</span> · Zona horaria: {data.tenant.timezone}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/${tenantSlug}/inbox`}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Ir al Inbox
          </Link>
        </div>
      </div>

      {/* Onboarding Checklist */}
      {data.onboarding && (() => {
        const steps = [
          {
            done: data.onboarding.hasProfile,
            label: "Completa el perfil del negocio y color de marca",
            href: `/dashboard/${tenantSlug}/agent`,
          },
          {
            done: data.onboarding.hasKnowledge,
            label: "Agrega al menos 1 FAQ o documento en Base de Conocimiento",
            href: `/dashboard/${tenantSlug}/knowledge`,
          },
          {
            done: data.onboarding.hasService,
            label: "Configura tus servicios y horarios de agenda",
            href: `/dashboard/${tenantSlug}/appointments`,
          },
          {
            done: data.onboarding.hasTestedChat,
            label: "Prueba tu agente en el chat público",
            href: `/chat/${tenantSlug}`,
          },
        ];
        const doneCount = steps.filter((s) => s.done).length;
        if (doneCount === steps.length) return null;
        return (
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5 shadow-sm">
            <button
              type="button"
              onClick={() => setShowOnboarding((v) => !v)}
              className="flex w-full items-center justify-between text-left"
            >
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Primeros pasos ({doneCount}/{steps.length} completados)
                </h2>
                <p className="text-xs text-slate-600">
                  Deja listo tu agente de IA en menos de 5 minutos.
                </p>
              </div>
              {showOnboarding ? (
                <ChevronUp className="h-4 w-4 text-slate-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-500" />
              )}
            </button>
            {showOnboarding && (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {steps.map((s) => (
                  <Link
                    key={s.label}
                    href={s.href}
                    className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs font-medium transition ${
                      s.done
                        ? "border-emerald-200 bg-emerald-50/70 text-emerald-800"
                        : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300"
                    }`}
                  >
                    {s.done ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-slate-300" />
                    )}
                    <span>{s.label}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Conversaciones totales",
            value: data.kpis.totalConversations,
            sub: `${data.kpis.handoffConversations} con asesor humano`,
            icon: MessageSquare,
            color: "text-indigo-600 bg-indigo-50",
          },
          {
            label: "Resolución Autónoma IA",
            value: `${data.kpis.aiResolutionRate}%`,
            sub: "Sin intervención humana",
            icon: Sparkles,
            color: "text-emerald-600 bg-emerald-50",
          },
          {
            label: "Citas próximas",
            value: data.kpis.upcomingAppointments,
            sub: `${data.usage.appointmentsCreated} creadas este mes`,
            icon: CalendarCheck,
            color: "text-sky-600 bg-sky-50",
          },
          {
            label: "Contactos / Leads",
            value: data.kpis.totalContacts,
            sub: "Capturados omnicanal",
            icon: Users,
            color: "text-violet-600 bg-violet-50",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {card.label}
              </span>
              <div className={`rounded-xl p-2 ${card.color}`}>
                <card.icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-bold text-slate-900">{card.value}</div>
            <div className="mt-1 text-xs text-slate-500">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Plan Usage Meter */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              Consumo del Plan ({data.tenant.plan.name}) — {data.usage.month}
            </h2>
          </div>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            {data.tenant.plan.code}
          </span>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <div className="mb-1.5 flex justify-between text-xs font-medium text-slate-600">
              <span>Mensajes procesados</span>
              <span>
                {data.usage.messagesCount.toLocaleString()} /{" "}
                {data.tenant.plan.monthlyMessageLimit.toLocaleString()} ({msgPct}%)
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all"
                style={{ width: `${msgPct}%` }}
              />
            </div>
          </div>
          <div>
            <div className="mb-1.5 flex justify-between text-xs font-medium text-slate-600">
              <span>Tokens IA consumidos</span>
              <span>
                {data.usage.totalTokens.toLocaleString()} /{" "}
                {data.tenant.plan.monthlyTokenLimit.toLocaleString()} ({tokPct}%)
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${tokPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom 2 columns: Attention needed + Upcoming Appointments */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Requieren atención humana
            </h2>
            <Link
              href={`/dashboard/${tenantSlug}/inbox`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"
            >
              Ver inbox <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {data.recentNeedsAttention.length === 0 ? (
            <p className="text-sm text-slate-500">
              Todo tranquilo. La IA está atendiendo todas las conversaciones activas.
            </p>
          ) : (
            <div className="space-y-3">
              {data.recentNeedsAttention.map((c) => (
                <Link
                  key={c.id}
                  href={`/dashboard/${tenantSlug}/inbox?id=${c.id}`}
                  className="block rounded-xl border border-amber-200 bg-amber-50/50 p-3 transition hover:bg-amber-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900">
                      {c.contact.name || "Visitante"}
                    </span>
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      {c.channel}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-600">
                    {c.handoffReason || c.messages[0]?.content}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Próximas citas</h2>
            <Link
              href={`/dashboard/${tenantSlug}/appointments`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"
            >
              Ver agenda <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {data.recentAppointments.length === 0 ? (
            <p className="text-sm text-slate-500">No hay citas próximas programadas.</p>
          ) : (
            <div className="space-y-2.5">
              {data.recentAppointments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-2.5"
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {a.service.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {a.contact.name || "Cliente"} ·{" "}
                      {new Date(a.startsAt).toLocaleString("es-MX", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                    {a.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
