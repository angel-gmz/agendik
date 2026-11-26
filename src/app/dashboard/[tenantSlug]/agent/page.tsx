"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Bot, Save, KeyRound, Building2, Loader2 } from "lucide-react";

export default function AgentConfigPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const [tenant, setTenant] = useState({
    name: "",
    description: "",
    timezone: "America/Mexico_City",
    email: "",
    phone: "",
    website: "",
    address: "",
    primaryColor: "#4f46e5",
    allowByok: false,
  });

  const [agent, setAgent] = useState({
    agentName: "",
    systemPrompt: "",
    tone: "",
    greetingMessage: "",
    handoffMessage: "",
    provider: "OPENAI",
    model: "gpt-4o-mini",
    temperature: 0.3,
    isActive: true,
    autoEscalateOnUnknown: true,
    hasByokKey: false,
    byokKeyMasked: "",
  });

  const [newByokKey, setNewByokKey] = useState("");
  const [runtime, setRuntime] = useState({ hasPlatformOpenAi: false, hasPlatformGoogle: false });

  useEffect(() => {
    fetch(`/api/tenants/${tenantSlug}/agent`)
      .then((r) => r.json())
      .then((data) => {
        if (data.tenant) setTenant(data.tenant);
        if (data.agentConfig) setAgent(data.agentConfig);
        if (data.runtimeStatus) setRuntime(data.runtimeStatus);
      })
      .finally(() => setLoading(false));
  }, [tenantSlug]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const payload: Record<string, unknown> = {
        tenant,
        agentConfig: {
          ...agent,
          ...(newByokKey ? { byokApiKey: newByokKey } : {}),
        },
      };
      const res = await fetch(`/api/tenants/${tenantSlug}/agent`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setNewByokKey("");
        setMsg("Configuración guardada correctamente.");
      } else {
        const d = await res.json();
        setMsg(d.error || "Error al guardar");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Agente de IA y Perfil del Negocio</h1>
          <p className="text-sm text-slate-500">
            Personaliza la personalidad del agente, el proveedor LLM y la identidad de tu tenant
          </p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar cambios
        </button>
      </div>

      {msg && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm text-indigo-800">
          {msg}
        </div>
      )}

      {!runtime.hasPlatformOpenAi && !runtime.hasPlatformGoogle && !agent.hasByokKey && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <strong>Modo simulador local activo:</strong> No hay API Key global (OPENAI_API_KEY /
          GOOGLE_GENERATIVE_AI_API_KEY) ni BYOK configurada. El agente responderá usando el
          simulador local de FAQs/citas hasta que agregues una clave.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Agent Persona & LLM */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Bot className="h-4 w-4 text-indigo-600" /> Comportamiento y LLM
          </h2>

          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
            <div>
              <div className="text-sm font-semibold text-slate-800">Agente IA Activo</div>
              <div className="text-xs text-slate-500">
                Si lo desactivas, los chats pasarán directo al inbox sin respuesta automática
              </div>
            </div>
            <input
              type="checkbox"
              checked={agent.isActive}
              onChange={(e) => setAgent({ ...agent, isActive: e.target.checked })}
              className="h-5 w-5 rounded border-slate-300 text-indigo-600"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Nombre del agente
              </label>
              <input
                type="text"
                value={agent.agentName}
                onChange={(e) => setAgent({ ...agent, agentName: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Tono</label>
              <input
                type="text"
                value={agent.tone}
                onChange={(e) => setAgent({ ...agent, tone: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Proveedor</label>
              <select
                value={agent.provider}
                onChange={(e) => {
                  const p = e.target.value;
                  setAgent({
                    ...agent,
                    provider: p,
                    model: p === "GOOGLE" ? "gemini-3.1-flash-lite" : "gpt-4o-mini",
                  });
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="OPENAI">OpenAI</option>
                <option value="GOOGLE">Google Gemini</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Modelo</label>
              <select
                value={agent.model}
                onChange={(e) => setAgent({ ...agent, model: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {agent.provider === "OPENAI" ? (
                  <>
                    <option value="gpt-4o-mini">gpt-4o-mini</option>
                    <option value="gpt-4o">gpt-4o</option>
                  </>
                ) : (
                  <>
                    <option value="gemini-flash-latest">gemini-flash-latest</option>
                    <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite</option>
                    <option value="gemini-3.8-flash">gemini-3.8-flash</option>
                    <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview</option>
                  </>
                )}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Temperatura ({agent.temperature})
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={agent.temperature}
                onChange={(e) => setAgent({ ...agent, temperature: Number(e.target.value) })}
                className="mt-2 w-full"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Prompt de sistema (Instrucciones base)
            </label>
            <textarea
              rows={4}
              value={agent.systemPrompt}
              onChange={(e) => setAgent({ ...agent, systemPrompt: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Mensaje de bienvenida
            </label>
            <textarea
              rows={2}
              value={agent.greetingMessage}
              onChange={(e) => setAgent({ ...agent, greetingMessage: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Mensaje al transferir a un humano
            </label>
            <textarea
              rows={2}
              value={agent.handoffMessage}
              onChange={(e) => setAgent({ ...agent, handoffMessage: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <KeyRound className="h-3.5 w-3.5 text-indigo-600" />
              BYOK — Tu propia API Key (opcional, cifrada AES-256)
            </div>
            {agent.hasByokKey && (
              <div className="mt-1 text-xs text-emerald-700">
                Clave actual guardada: <span className="font-mono">{agent.byokKeyMasked}</span>
              </div>
            )}
            <input
              type="password"
              value={newByokKey}
              onChange={(e) => setNewByokKey(e.target.value)}
              placeholder="sk-... o AIza... (dejar vacío para mantener la actual)"
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Business Profile */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Building2 className="h-4 w-4 text-indigo-600" /> Perfil del Negocio y Marca
          </h2>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Nombre</label>
            <input
              type="text"
              value={tenant.name}
              onChange={(e) => setTenant({ ...tenant, name: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Descripción</label>
            <textarea
              rows={3}
              value={tenant.description}
              onChange={(e) => setTenant({ ...tenant, description: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
              <input
                type="email"
                value={tenant.email}
                onChange={(e) => setTenant({ ...tenant, email: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Teléfono</label>
              <input
                type="text"
                value={tenant.phone}
                onChange={(e) => setTenant({ ...tenant, phone: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Dirección</label>
            <input
              type="text"
              value={tenant.address}
              onChange={(e) => setTenant({ ...tenant, address: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Zona horaria</label>
              <input
                type="text"
                value={tenant.timezone}
                onChange={(e) => setTenant({ ...tenant, timezone: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Color primario del widget
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={tenant.primaryColor}
                  onChange={(e) => setTenant({ ...tenant, primaryColor: e.target.value })}
                  className="h-9 w-12 cursor-pointer rounded border border-slate-300"
                />
                <input
                  type="text"
                  value={tenant.primaryColor}
                  onChange={(e) => setTenant({ ...tenant, primaryColor: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
