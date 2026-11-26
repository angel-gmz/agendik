"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Bot,
  Send,
  User,
  Loader2,
  Sparkles,
  Headphones,
  RotateCcw,
  X,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Star,
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  createdAt?: string;
  failedText?: string;
}

interface WidgetConfig {
  buttonLabel?: string;
  showServices?: boolean;
  quickPrompts?: string[];
}

interface TenantPublicInfo {
  name: string;
  slug: string;
  description?: string | null;
  primaryColor: string;
  agentName: string;
  greetingMessage: string;
  widgetConfig?: WidgetConfig;
  services: Array<{
    id: string;
    name: string;
    durationMinutes: number;
    priceCents: number;
    currency: string;
  }>;
}

const DEFAULT_PROMPTS = [
  "¿Qué horarios tienen?",
  "Quiero agendar una cita",
  "¿Qué servicios ofrecen?",
  "Hablar con un humano",
];

function getContrastTextColor(hex: string): "#ffffff" | "#0f172a" {
  const clean = hex.replace("#", "").trim();
  if (clean.length !== 6) return "#ffffff";
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 0.62 ? "#0f172a" : "#ffffff";
}

function formatTime(iso?: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function renderInlineMarkdown(text: string): React.ReactNode[] {
  // Split by **bold** or URLs
  const tokens = text.split(/(\*\*[^*]+\*\*|https?:\/\/[^\s)]+)/g);
  return tokens.map((tok, i) => {
    if (tok.startsWith("**") && tok.endsWith("**") && tok.length > 4) {
      return (
        <strong key={i} className="font-semibold">
          {tok.slice(2, -2)}
        </strong>
      );
    }
    if (/^https?:\/\//.test(tok)) {
      return (
        <a
          key={i}
          href={tok}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-current/60 hover:opacity-80"
        >
          {tok}
        </a>
      );
    }
    return <React.Fragment key={i}>{tok}</React.Fragment>;
  });
}

function SafeMarkdown({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, idx) => {
        const bulletMatch = line.match(/^\s*[-*•]\s+(.*)$/);
        if (bulletMatch) {
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-1">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" />
              <span>{renderInlineMarkdown(bulletMatch[1])}</span>
            </div>
          );
        }
        if (!line.trim()) {
          return <div key={idx} className="h-1" />;
        }
        return <div key={idx}>{renderInlineMarkdown(line)}</div>;
      })}
    </div>
  );
}

export default function ChatWidgetClient({
  tenantSlug,
  embedded = false,
}: {
  tenantSlug: string;
  embedded?: boolean;
}) {
  const [tenant, setTenant] = useState<TenantPublicInfo | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("AI_ACTIVE");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  // Lead capture inline state (during HUMAN_HANDOFF)
  const [contactSaved, setContactSaved] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [savingLead, setSavingLead] = useState(false);

  // Resolution rating state
  const [ratingSent, setRatingSent] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isNearBottomRef = useRef(true);

  const storageKey = `agenteia_conv_${tenantSlug}`;

  const scrollToBottom = useCallback((force = false) => {
    const el = scrollRef.current;
    if (!el) return;
    if (force || isNearBottomRef.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, []);

  const loadConversation = useCallback(
    async (convId: string | null) => {
      const qs = convId ? `?conversationId=${encodeURIComponent(convId)}` : "";
      const res = await fetch(`/api/public/chat/${tenantSlug}${qs}`);
      if (!res.ok) {
        setError("No se encontró este negocio.");
        return;
      }
      const data = await res.json();
      setTenant(data.tenant);
      if (data.conversationStatus) setStatus(data.conversationStatus);
      if (data.contact && (data.contact.email || data.contact.phone)) {
        setContactSaved(true);
      }
      if (Array.isArray(data.messages) && data.messages.length > 0) {
        setMessages(data.messages);
      } else {
        setMessages([
          {
            id: "greeting",
            role: "ASSISTANT",
            content: data.tenant.greetingMessage,
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    },
    [tenantSlug]
  );

  useEffect(() => {
    const savedId = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;
    if (savedId) setConversationId(savedId);
    loadConversation(savedId);
  }, [storageKey, loadConversation]);

  // Smart polling: ONLY when status === HUMAN_HANDOFF and tab is visible
  useEffect(() => {
    if (!conversationId || status !== "HUMAN_HANDOFF") return;
    const interval = setInterval(async () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      try {
        const res = await fetch(
          `/api/public/chat/${tenantSlug}?conversationId=${encodeURIComponent(conversationId)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.conversationStatus) setStatus(data.conversationStatus);
        if (Array.isArray(data.messages) && data.messages.length > 0) {
          setMessages((prev) => (data.messages.length !== prev.length ? data.messages : prev));
        }
      } catch {
        // Ignore transient poll errors
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [conversationId, status, tenantSlug]);

  useEffect(() => {
    scrollToBottom(false);
  }, [messages, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [input]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = distanceFromBottom < 80;
  }

  function handleResetConversation() {
    if (typeof window !== "undefined") {
      localStorage.removeItem(storageKey);
    }
    setConversationId(null);
    setStatus("AI_ACTIVE");
    setContactSaved(false);
    setRatingSent(null);
    setLeadName("");
    setLeadEmail("");
    setLeadPhone("");
    setMessages(
      tenant
        ? [
            {
              id: `greeting_${Date.now()}`,
              role: "ASSISTANT",
              content: tenant.greetingMessage,
              createdAt: new Date().toISOString(),
            },
          ]
        : []
    );
  }

  async function sendMessage(textToSend?: string, removeErrorMsgId?: string) {
    const text = (textToSend ?? input).trim();
    if (!text || sending) return;
    if (!textToSend) setInput("");
    setSending(true);

    const nowIso = new Date().toISOString();
    setMessages((prev) => {
      const cleaned = removeErrorMsgId ? prev.filter((m) => m.id !== removeErrorMsgId) : prev;
      if (removeErrorMsgId) return cleaned;
      return [...cleaned, { id: `tmp_${Date.now()}`, role: "USER", content: text, createdAt: nowIso }];
    });
    setTimeout(() => scrollToBottom(true), 50);

    try {
      const res = await fetch(`/api/public/chat/${tenantSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          conversationId: conversationId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            role: "ERROR",
            content: data.error || "Ocurrió un error al enviar tu mensaje.",
            failedText: text,
            createdAt: new Date().toISOString(),
          },
        ]);
      } else {
        if (data.conversationId && data.conversationId !== conversationId) {
          setConversationId(data.conversationId);
          localStorage.setItem(storageKey, data.conversationId);
        }
        if (data.status) setStatus(data.status);
        if (data.replyText) {
          setMessages((prev) => [
            ...prev,
            {
              id: `bot_${Date.now()}`,
              role: "ASSISTANT",
              content: data.replyText,
              createdAt: new Date().toISOString(),
            },
          ]);
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: "ERROR",
          content: "Error de conexión. Verifica tu internet e intenta de nuevo.",
          failedText: text,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  async function handleSaveLead(e: React.FormEvent) {
    e.preventDefault();
    if (!conversationId || savingLead) return;
    setSavingLead(true);
    try {
      const res = await fetch(`/api/public/chat/${tenantSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          name: leadName,
          email: leadEmail,
          phone: leadPhone,
        }),
      });
      if (res.ok) setContactSaved(true);
    } finally {
      setSavingLead(false);
    }
  }

  async function handleRating(stars: number) {
    setRatingSent(stars);
    if (!conversationId) return;
    await fetch(`/api/public/chat/${tenantSlug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, rating: stars }),
    }).catch(() => {});
  }

  if (error) {
    return (
      <div className="flex h-full min-h-[300px] items-center justify-center p-6 text-sm text-red-600">
        {error}
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex h-full min-h-[300px] items-center justify-center text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const accent = tenant.primaryColor || "#4f46e5";
  const accentText = getContrastTextColor(accent);
  const hasUserMessages = messages.some((m) => m.role === "USER");
  const quickPrompts =
    tenant.widgetConfig?.quickPrompts && tenant.widgetConfig.quickPrompts.length > 0
      ? tenant.widgetConfig.quickPrompts
      : DEFAULT_PROMPTS;
  const showServices =
    (tenant.widgetConfig?.showServices ?? true) && !hasUserMessages && tenant.services.length > 0;

  return (
    <div
      className={`flex flex-col bg-white ${
        embedded
          ? "h-[100dvh] w-full"
          : "mx-auto h-[100dvh] w-full max-w-2xl overflow-hidden sm:h-[calc(100dvh-3rem)] sm:rounded-2xl sm:border sm:border-slate-200 sm:shadow-xl"
      }`}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3.5 sm:px-5"
        style={{ backgroundColor: accent, color: accentText }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
            <Bot className="h-5 w-5" />
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold leading-tight">{tenant.agentName}</div>
            <div className="truncate text-xs opacity-90">{tenant.name}</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {status === "HUMAN_HANDOFF" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/25 px-2.5 py-1 text-[11px] font-semibold">
              <Headphones className="h-3 w-3" /> Humano
            </span>
          ) : status === "RESOLVED" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/25 px-2.5 py-1 text-[11px] font-semibold">
              <CheckCircle2 className="h-3 w-3" /> Resuelto
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold">
              <Sparkles className="h-3 w-3" /> IA Activa
            </span>
          )}

          {hasUserMessages && (
            <button
              type="button"
              onClick={handleResetConversation}
              title="Reiniciar conversación"
              className="rounded-lg p-1.5 transition hover:bg-white/20"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}

          {embedded && (
            <button
              type="button"
              onClick={() => window.parent?.postMessage({ type: "agenteia:close" }, "*")}
              title="Cerrar chat"
              className="rounded-lg p-1.5 transition hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Persistent status banners */}
      {status === "HUMAN_HANDOFF" && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
          <div className="flex items-center gap-2 font-semibold">
            <Headphones className="h-3.5 w-3.5 shrink-0 text-amber-600" />
            Un asesor humano está revisando tu caso. Puedes seguir escribiendo aquí.
          </div>
          {!contactSaved && conversationId && (
            <form onSubmit={handleSaveLead} className="mt-2 grid gap-2 sm:grid-cols-3">
              <input
                type="text"
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                placeholder="Tu nombre"
                className="rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
              />
              <input
                type="email"
                value={leadEmail}
                onChange={(e) => setLeadEmail(e.target.value)}
                placeholder="Tu correo"
                className="rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
              />
              <div className="flex gap-1.5">
                <input
                  type="tel"
                  value={leadPhone}
                  onChange={(e) => setLeadPhone(e.target.value)}
                  placeholder="Teléfono"
                  className="w-full rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={savingLead || (!leadName && !leadEmail && !leadPhone)}
                  className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  Enviar
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Quick prompts (collapsed once conversation starts) */}
      {!hasUserMessages && (
        <div className="flex gap-2 overflow-x-auto border-b border-slate-100 bg-slate-50 px-4 py-2.5">
          {quickPrompts.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => sendMessage(q)}
              className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50/40 hover:text-indigo-700"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 space-y-3 overflow-y-auto bg-slate-50/40 p-4"
      >
        {/* Contextual welcome card */}
        {!hasUserMessages && (tenant.description || showServices) && (
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
            {tenant.description && (
              <p className="text-xs leading-relaxed text-slate-600">{tenant.description}</p>
            )}
            {showServices && (
              <div className="mt-2.5">
                <div className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  <Calendar className="h-3 w-3" /> Servicios disponibles
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {tenant.services.slice(0, 5).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => sendMessage(`Quiero agendar ${s.name}`)}
                      className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left transition hover:border-indigo-300 hover:bg-indigo-50/40"
                    >
                      <div className="text-xs font-semibold text-slate-800">{s.name}</div>
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        {s.durationMinutes} min ·{" "}
                        {s.priceCents > 0
                          ? `$${(s.priceCents / 100).toFixed(0)} ${s.currency}`
                          : "Gratis"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {messages.map((m) => {
          const isUser = m.role === "USER";
          const isHuman = m.role === "HUMAN_AGENT";
          const isError = m.role === "ERROR";

          if (isError) {
            return (
              <div
                key={m.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{m.content}</span>
                </div>
                {m.failedText && (
                  <button
                    type="button"
                    onClick={() => sendMessage(m.failedText, m.id)}
                    className="shrink-0 rounded-lg bg-red-600 px-2.5 py-1 font-semibold text-white hover:bg-red-700"
                  >
                    Reintentar
                  </button>
                )}
              </div>
            );
          }

          return (
            <div
              key={m.id}
              className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}
            >
              {!isUser && (
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    isHuman ? "bg-amber-500 text-white" : ""
                  }`}
                  style={!isHuman ? { backgroundColor: accent, color: accentText } : undefined}
                >
                  {isHuman ? <Headphones className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                </div>
              )}
              <div
                className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-xs ${
                  isUser
                    ? "rounded-br-sm"
                    : isHuman
                    ? "rounded-bl-sm border border-amber-200 bg-amber-50 text-slate-900"
                    : "rounded-bl-sm border border-slate-200/70 bg-white text-slate-800"
                }`}
                style={isUser ? { backgroundColor: accent, color: accentText } : undefined}
              >
                {isHuman && (
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                    Asesor Humano
                  </div>
                )}
                <SafeMarkdown content={m.content} />
                {m.createdAt && (
                  <div
                    className={`mt-1 text-right text-[10px] ${
                      isUser ? "opacity-75" : "text-slate-400"
                    }`}
                  >
                    {formatTime(m.createdAt)}
                  </div>
                )}
              </div>
              {isUser && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                  <User className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          );
        })}

        {sending && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {tenant.agentName} está escribiendo...
          </div>
        )}
      </div>

      {/* Resolved bar or Input */}
      {status === "RESOLVED" ? (
        <div className="border-t border-emerald-200 bg-emerald-50 px-4 py-3 text-center">
          <div className="text-xs font-semibold text-emerald-900">
            Esta conversación fue marcada como resuelta.
          </div>
          <div className="mt-2 flex items-center justify-center gap-1">
            {ratingSent ? (
              <span className="text-xs text-emerald-700">
                ¡Gracias por calificarnos con {ratingSent}/5!
              </span>
            ) : (
              <>
                <span className="mr-1 text-xs text-emerald-800">¿Cómo te atendimos?</span>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => handleRating(n)}
                    className="rounded p-1 text-amber-500 transition hover:scale-110"
                    title={`${n} estrellas`}
                  >
                    <Star className="h-4 w-4 fill-amber-400" />
                  </button>
                ))}
              </>
            )}
          </div>
          <button
            type="button"
            onClick={handleResetConversation}
            className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition"
            style={{ backgroundColor: accent, color: accentText }}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Nueva conversación
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex items-end gap-2 border-t border-slate-200 bg-white p-3"
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Escribe tu duda o pide agendar una cita... (Shift+Enter nueva línea)"
            className="max-h-28 flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition disabled:opacity-50"
            style={{ backgroundColor: accent, color: accentText }}
            aria-label="Enviar mensaje"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      )}
    </div>
  );
}
