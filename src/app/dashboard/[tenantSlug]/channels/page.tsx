"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Code2,
  Calendar,
  Bell,
  Send,
  Copy,
  Check,
  MessageCircle,
  Loader2,
  Globe,
  Sparkles,
} from "lucide-react";

interface ChannelRow {
  id: string;
  type: "WEB" | "WHATSAPP" | "INSTAGRAM" | "MESSENGER";
  name: string;
  isActive: boolean;
  phoneNumberId: string;
  pageId: string;
  webhookVerifyToken: string;
  hasAccessToken: boolean;
  accessTokenMasked: string;
  widgetConfigJson?: {
    buttonLabel?: string;
    showServices?: boolean;
    quickPrompts?: string[];
    allowedOrigins?: string[];
  } | null;
}

interface NotifRule {
  notifyOnBooking: boolean;
  notifyOnCancellation: boolean;
  notifyOnHandoff: boolean;
  sendAppointmentReminders: boolean;
  reminderHoursBefore: number;
  emailRecipients: string;
  whatsappRecipients: string;
}

interface NotifLog {
  id: string;
  type: string;
  channel: string;
  recipient: string;
  subject: string | null;
  status: string;
  createdAt: string;
}

export default function ChannelsPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [channels, setChannels] = useState<ChannelRow[]>([]);
  const [primaryColor, setPrimaryColor] = useState("#4f46e5");
  const [planCode, setPlanCode] = useState("FREE");
  const [customDomain, setCustomDomain] = useState("");
  const [googleCal, setGoogleCal] = useState<{ connected: boolean; googleEmail?: string }>({
    connected: false,
  });
  const [googleConfigured, setGoogleConfigured] = useState(false);
  const [notifRule, setNotifRule] = useState<NotifRule>({
    notifyOnBooking: true,
    notifyOnCancellation: true,
    notifyOnHandoff: true,
    sendAppointmentReminders: true,
    reminderHoursBefore: 24,
    emailRecipients: "",
    whatsappRecipients: "",
  });
  const [notifLogs, setNotifLogs] = useState<NotifLog[]>([]);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [loading, setLoading] = useState(true);

  // Widget configurator state
  const [buttonLabel, setButtonLabel] = useState("¿Dudas o citas?");
  const [showServices, setShowServices] = useState(true);
  const [quickPromptsText, setQuickPromptsText] = useState(
    "¿Qué horarios tienen?\nQuiero agendar una cita\n¿Qué servicios ofrecen?\nHablar con un humano"
  );
  const [allowedOriginsText, setAllowedOriginsText] = useState("");

  // Simulator state
  const [simChannel, setSimChannel] = useState<"WHATSAPP" | "INSTAGRAM" | "MESSENGER">("WHATSAPP");
  const [simName, setSimName] = useState("Carlos Demo");
  const [simText, setSimText] = useState("Hola, ¿qué horarios tienen para una cita?");
  const [simReply, setSimReply] = useState("");

  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const embedSnippet = `<script src="${appUrl}/widget.js" data-tenant="${tenantSlug}" data-color="${primaryColor}" data-label="${buttonLabel.replace(/"/g, "")}" async></script>`;
  const webhookUrl = `${appUrl}/api/webhooks/meta/${tenantSlug}`;

  const loadData = useCallback(async () => {
    const res = await fetch(`/api/tenants/${tenantSlug}/channels`);
    if (res.ok) {
      const data = await res.json();
      setChannels(data.channels || []);
      if (data.tenantPrimaryColor) setPrimaryColor(data.tenantPrimaryColor);
      if (data.planCode) setPlanCode(data.planCode);
      setCustomDomain(data.tenantCustomDomain || "");
      setGoogleCal(data.googleCalendar || { connected: false });
      setGoogleConfigured(Boolean(data.googleOAuthConfigured));
      if (data.notificationRule) setNotifRule(data.notificationRule);
      setNotifLogs(data.notificationLogs || []);

      const webCh = (data.channels || []).find((c: ChannelRow) => c.type === "WEB");
      if (webCh?.widgetConfigJson) {
        if (webCh.widgetConfigJson.buttonLabel) setButtonLabel(webCh.widgetConfigJson.buttonLabel);
        if (webCh.widgetConfigJson.showServices !== undefined) {
          setShowServices(Boolean(webCh.widgetConfigJson.showServices));
        }
        if (Array.isArray(webCh.widgetConfigJson.quickPrompts) && webCh.widgetConfigJson.quickPrompts.length > 0) {
          setQuickPromptsText(webCh.widgetConfigJson.quickPrompts.join("\n"));
        }
        if (Array.isArray(webCh.widgetConfigJson.allowedOrigins)) {
          setAllowedOriginsText(webCh.widgetConfigJson.allowedOrigins.join("\n"));
        }
      }
    }
    setLoading(false);
  }, [tenantSlug]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function saveWidgetConfig(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setErrMsg("");
    const res = await fetch(`/api/tenants/${tenantSlug}/channels`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "widget_config",
        buttonLabel,
        showServices,
        quickPrompts: quickPromptsText
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        allowedOrigins: allowedOriginsText
          .split(/[\n,]/)
          .map((s) => s.trim())
          .filter(Boolean),
      }),
    });
    if (res.ok) {
      setMsg("Configuración del Widget Web guardada.");
      loadData();
    } else {
      const data = await res.json().catch(() => ({}));
      setErrMsg(data.error || "No se pudo guardar el widget.");
    }
  }

  async function saveCustomDomain(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setErrMsg("");
    const res = await fetch(`/api/tenants/${tenantSlug}/channels`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "custom_domain", customDomain }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setMsg("Dominio personalizado actualizado.");
      loadData();
    } else {
      setErrMsg(data.error || "Error guardando dominio personalizado.");
    }
  }

  async function saveChannel(ch: ChannelRow, newToken?: string) {
    setMsg("");
    setErrMsg("");
    const res = await fetch(`/api/tenants/${tenantSlug}/channels`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "channel",
        type: ch.type,
        name: ch.name,
        isActive: ch.isActive,
        phoneNumberId: ch.phoneNumberId,
        pageId: ch.pageId,
        webhookVerifyToken: ch.webhookVerifyToken,
        accessToken: newToken,
      }),
    });
    if (res.ok) {
      setMsg(`Canal ${ch.type} actualizado.`);
      loadData();
    } else {
      const data = await res.json().catch(() => ({}));
      setErrMsg(data.error || "Error actualizando canal.");
    }
  }

  async function saveNotifications(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setErrMsg("");
    await fetch(`/api/tenants/${tenantSlug}/channels`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "notifications", ...notifRule }),
    });
    setMsg("Reglas de notificación guardadas.");
    loadData();
  }

  async function runSimulator(e: React.FormEvent) {
    e.preventDefault();
    setSimReply("Procesando...");
    const res = await fetch(`/api/tenants/${tenantSlug}/channels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: simChannel,
        senderName: simName,
        text: simText,
      }),
    });
    const data = await res.json();
    setSimReply(data.result?.replyText || "Mensaje guardado en el Inbox.");
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Canales Omnicanal, Widget Web, Google Calendar y Notificaciones
        </h1>
        <p className="text-sm text-slate-500">
          Personaliza e instala tu widget web, conecta Meta (WhatsApp/IG/Messenger), sincroniza Google Calendar y configura alertas
        </p>
      </div>

      {msg && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm text-indigo-800">
          {msg}
        </div>
      )}
      {errMsg && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {errMsg}
        </div>
      )}

      {/* Widget Web Configurator & Embed */}
      <div className="grid gap-6 lg:grid-cols-5">
        <form
          onSubmit={saveWidgetConfig}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-3"
        >
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Code2 className="h-4 w-4 text-indigo-600" /> Widget Web Embebible y Personalización
          </h2>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Texto del botón flotante
              </label>
              <input
                type="text"
                value={buttonLabel}
                onChange={(e) => setButtonLabel(e.target.value)}
                maxLength={40}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={showServices}
                  onChange={(e) => setShowServices(e.target.checked)}
                />
                Mostrar tarjetas de servicios al abrir el chat
              </label>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Preguntas rápidas (una por línea)
              </label>
              <textarea
                rows={4}
                value={quickPromptsText}
                onChange={(e) => setQuickPromptsText(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Orígenes permitidos (opcional, uno por línea)
              </label>
              <textarea
                rows={4}
                value={allowedOriginsText}
                onChange={(e) => setAllowedOriginsText(e.target.value)}
                placeholder="https://midominio.com&#10;https://www.midominio.com"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            Guardar configuración del widget
          </button>

          <div className="pt-2">
            <p className="text-xs text-slate-500">
              Pega este código antes de <code>&lt;/body&gt;</code> en tu sitio web:
            </p>
            <div className="mt-2 flex items-center gap-2 rounded-xl bg-slate-900 p-3 font-mono text-xs text-emerald-300">
              <code className="flex-1 overflow-x-auto">{embedSnippet}</code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(embedSnippet);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="shrink-0 rounded-lg bg-white/10 px-2.5 py-1.5 text-white hover:bg-white/20"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <div className="mt-2.5 text-xs text-slate-600">
              Webhook unificado Meta:{" "}
              <span className="font-mono font-semibold text-indigo-700">{webhookUrl}</span>
            </div>
          </div>
        </form>

        {/* Live Widget Preview + Custom Domain */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Sparkles className="h-4 w-4 text-indigo-600" /> Vista previa del botón
            </h2>
            <div className="mt-4 flex h-36 flex-col items-end justify-end rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
              <div
                className="inline-flex items-center gap-2.5 rounded-full px-4 py-2.5 text-sm font-semibold text-white shadow-lg"
                style={{ backgroundColor: primaryColor }}
              >
                <MessageCircle className="h-4 w-4" />
                <span>{buttonLabel || "¿Dudas o citas?"}</span>
                <span className="h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-white/40" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              El color se sincroniza automáticamente con el color primario en Configuración del Agente.
            </p>
          </div>

          <form
            onSubmit={saveCustomDomain}
            className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="flex items-center justify-between text-sm font-bold text-slate-900">
              <span className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-indigo-600" /> Dominio Personalizado
              </span>
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                Enterprise
              </span>
            </h2>
            <input
              type="text"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              disabled={planCode !== "ENTERPRISE"}
              placeholder="chat.tunegocio.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
            />
            <p className="text-[11px] text-slate-500">
              Crea un registro DNS <code>CNAME</code> apuntando a <code>atendik.com</code>.
            </p>
            <button
              type="submit"
              disabled={planCode !== "ENTERPRISE"}
              className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Guardar dominio
            </button>
          </form>
        </div>
      </div>

      {/* Meta Channels + Simulator */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <MessageCircle className="h-4 w-4 text-emerald-600" /> Conectores Meta (WhatsApp / IG / Messenger)
          </h2>
          {channels
            .filter((c) => c.type !== "WEB")
            .map((ch) => (
              <ChannelConfigCard key={ch.id} channel={ch} onSave={saveChannel} />
            ))}
        </div>

        <div className="space-y-6">
          {/* Omnichannel Webhook Simulator */}
          <form
            onSubmit={runSimulator}
            className="space-y-3 rounded-2xl border border-indigo-200 bg-indigo-50/40 p-6 shadow-sm"
          >
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Send className="h-4 w-4 text-indigo-600" /> Simulador de WhatsApp / IG / Messenger
            </h2>
            <p className="text-xs text-slate-600">
              Prueba el flujo omnicanal e inbox sin necesitar todavía una cuenta verificada de Meta.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={simChannel}
                onChange={(e) => setSimChannel(e.target.value as typeof simChannel)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="WHATSAPP">WhatsApp</option>
                <option value="INSTAGRAM">Instagram DM</option>
                <option value="MESSENGER">Messenger</option>
              </select>
              <input
                type="text"
                value={simName}
                onChange={(e) => setSimName(e.target.value)}
                placeholder="Nombre cliente"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <input
              type="text"
              value={simText}
              onChange={(e) => setSimText(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              Simular mensaje entrante
            </button>
            {simReply && (
              <div className="whitespace-pre-wrap rounded-xl border border-indigo-200 bg-white p-3 text-xs text-slate-700">
                <strong>Respuesta del agente:</strong>
                <div className="mt-1">{simReply}</div>
              </div>
            )}
          </form>

          {/* Google Calendar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Calendar className="h-4 w-4 text-blue-600" /> Sincronización Google Calendar
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Lee eventos ocupados en tiempo real y crea/actualiza/elimina citas automáticamente.
            </p>
            <div className="mt-4">
              {googleCal.connected ? (
                <div className="flex items-center justify-between rounded-xl bg-emerald-50 p-3 text-xs">
                  <span className="font-semibold text-emerald-800">
                    Conectado: {googleCal.googleEmail || "Google Calendar"}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      await fetch(`/api/tenants/${tenantSlug}/channels`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ kind: "disconnect_google" }),
                      });
                      loadData();
                    }}
                    className="font-semibold text-red-600 underline"
                  >
                    Desconectar
                  </button>
                </div>
              ) : (
                <a
                  href={`/api/integrations/google/authorize?tenantSlug=${tenantSlug}`}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-white ${
                    googleConfigured ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-400"
                  }`}
                >
                  Conectar Google Calendar (OAuth2)
                </a>
              )}
              {!googleConfigured && !googleCal.connected && (
                <p className="mt-2 text-[11px] text-amber-700">
                  Configura GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en .env para activar OAuth.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notifications & Logs */}
      <div className="grid gap-6 lg:grid-cols-2">
        <form
          onSubmit={saveNotifications}
          className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Bell className="h-4 w-4 text-indigo-600" /> Alertas y Recordatorios
          </h2>
          <div className="space-y-2 text-sm">
            {[
              { key: "notifyOnBooking", label: "Notificar al agendar nueva cita" },
              { key: "notifyOnCancellation", label: "Notificar cancelaciones" },
              { key: "notifyOnHandoff", label: "Notificar cuando la IA solicite ayuda humana" },
              { key: "sendAppointmentReminders", label: "Enviar recordatorios automáticos de citas" },
            ].map((item) => (
              <label key={item.key} className="flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(notifRule[item.key as keyof NotifRule])}
                  onChange={(e) =>
                    setNotifRule({ ...notifRule, [item.key]: e.target.checked })
                  }
                />
                {item.label}
              </label>
            ))}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Correos destinatarios (separados por coma)
            </label>
            <input
              type="text"
              value={notifRule.emailRecipients}
              onChange={(e) => setNotifRule({ ...notifRule, emailRecipients: e.target.value })}
              placeholder="recepcion@negocio.com, admin@negocio.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              WhatsApp destinatarios (separados por coma)
            </label>
            <input
              type="text"
              value={notifRule.whatsappRecipients}
              onChange={(e) => setNotifRule({ ...notifRule, whatsappRecipients: e.target.value })}
              placeholder="+525512345678"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            Guardar reglas de notificación
          </button>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-base font-bold text-slate-900">Historial de notificaciones</h2>
          {notifLogs.length === 0 ? (
            <p className="text-xs text-slate-400">Aún no se han disparado notificaciones.</p>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {notifLogs.map((l) => (
                <div
                  key={l.id}
                  className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
                >
                  <div className="flex items-center justify-between font-semibold text-slate-800">
                    <span>
                      [{l.channel}] {l.type} → {l.recipient}
                    </span>
                    <span className="rounded bg-white px-1.5 py-0.5 text-[10px] text-indigo-700">
                      {l.status}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate text-slate-500">{l.subject}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChannelConfigCard({
  channel,
  onSave,
}: {
  channel: ChannelRow;
  onSave: (ch: ChannelRow, newToken?: string) => Promise<void>;
}) {
  const [state, setState] = useState(channel);
  const [token, setToken] = useState("");

  return (
    <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-slate-900">{state.type}</span>
        <label className="flex items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={state.isActive}
            onChange={(e) => setState({ ...state, isActive: e.target.checked })}
          />
          Activo
        </label>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          type="text"
          placeholder={state.type === "WHATSAPP" ? "Phone Number ID" : "Page / IG Account ID"}
          value={state.type === "WHATSAPP" ? state.phoneNumberId : state.pageId}
          onChange={(e) =>
            setState(
              state.type === "WHATSAPP"
                ? { ...state, phoneNumberId: e.target.value }
                : { ...state, pageId: e.target.value }
            )
          }
          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
        />
        <input
          type="text"
          placeholder="Webhook Verify Token"
          value={state.webhookVerifyToken}
          onChange={(e) => setState({ ...state, webhookVerifyToken: e.target.value })}
          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
        />
      </div>
      <input
        type="password"
        placeholder={
          state.hasAccessToken
            ? `Token guardado (${state.accessTokenMasked})`
            : "Meta Permanent Access Token"
        }
        value={token}
        onChange={(e) => setToken(e.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
      />
      <button
        type="button"
        onClick={() => {
          onSave(state, token || undefined);
          setToken("");
        }}
        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
      >
        Guardar {state.type}
      </button>
    </div>
  );
}
