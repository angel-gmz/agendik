"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  Bot,
  Headphones,
  Send,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  User,
} from "lucide-react";

interface ConversationItem {
  id: string;
  channel: string;
  status: "AI_ACTIVE" | "HUMAN_HANDOFF" | "RESOLVED";
  needsHumanAttention: boolean;
  handoffReason: string | null;
  lastMessageAt: string;
  contact: { id: string; name: string | null; email: string | null; phone: string | null };
  messages: Array<{ content: string; role: string }>;
}

interface ConversationDetail {
  id: string;
  channel: string;
  status: "AI_ACTIVE" | "HUMAN_HANDOFF" | "RESOLVED";
  needsHumanAttention: boolean;
  handoffReason: string | null;
  contact: {
    name: string | null;
    email: string | null;
    phone: string | null;
    appointments: Array<{
      id: string;
      startsAt: string;
      status: string;
      service: { name: string };
    }>;
  };
  messages: Array<{
    id: string;
    role: string;
    content: string;
    createdAt: string;
    tokensInput: number;
    tokensOutput: number;
  }>;
}

export default function InboxPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const searchParams = useSearchParams();
  const initialId = searchParams.get("id");

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialId);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [channelFilter, setChannelFilter] = useState<string>("");
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const loadList = useCallback(async () => {
    const qs = channelFilter ? `?channel=${channelFilter}` : "";
    const res = await fetch(`/api/tenants/${tenantSlug}/conversations${qs}`);
    if (res.ok) {
      const data = await res.json();
      setConversations(data.conversations || []);
      if (!selectedId && data.conversations?.length > 0) {
        setSelectedId(data.conversations[0].id);
      }
    }
  }, [tenantSlug, channelFilter, selectedId]);

  const loadDetail = useCallback(async () => {
    if (!selectedId) return;
    const res = await fetch(`/api/tenants/${tenantSlug}/conversations/${selectedId}`);
    if (res.ok) {
      const data = await res.json();
      setDetail(data.conversation);
    }
  }, [tenantSlug, selectedId]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    loadDetail();
    const timer = setInterval(() => {
      loadList();
      loadDetail();
    }, 5000);
    return () => clearInterval(timer);
  }, [loadList, loadDetail]);

  async function sendHumanReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || !reply.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/conversations/${selectedId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: reply.trim() }),
      });
      if (res.ok) {
        setReply("");
        await Promise.all([loadDetail(), loadList()]);
      }
    } finally {
      setSending(false);
    }
  }

  async function updateStatus(status: "AI_ACTIVE" | "HUMAN_HANDOFF" | "RESOLVED") {
    if (!selectedId) return;
    await fetch(`/api/tenants/${tenantSlug}/conversations/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await Promise.all([loadDetail(), loadList()]);
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inbox Omnicanal</h1>
          <p className="text-sm text-slate-500">
            Supervisa chats en tiempo real y toma el control humano cuando lo necesites
          </p>
        </div>
        <div className="flex items-center gap-2">
          {["", "WEB", "WHATSAPP", "INSTAGRAM", "MESSENGER"].map((ch) => (
            <button
              key={ch || "ALL"}
              type="button"
              onClick={() => setChannelFilter(ch)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                channelFilter === ch
                  ? "bg-indigo-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {ch || "Todos"}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              loadList();
              loadDetail();
            }}
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-12">
        {/* Conversation list */}
        <div className="overflow-y-auto border-r border-slate-200 lg:col-span-4">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-400">
              Aún no hay conversaciones en este canal.
            </div>
          ) : (
            conversations.map((c) => {
              const active = c.id === selectedId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full border-b border-slate-100 p-4 text-left transition ${
                    active ? "bg-indigo-50/70" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-slate-900">
                      {c.contact.name || "Visitante"}
                    </span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                      {c.channel}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {c.messages[0]?.content || "Sin mensajes"}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    {c.needsHumanAttention ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-amber-600">
                        <AlertCircle className="h-3 w-3" /> Requiere humano
                      </span>
                    ) : c.status === "HUMAN_HANDOFF" ? (
                      <span className="font-semibold text-amber-700">Control Humano</span>
                    ) : c.status === "RESOLVED" ? (
                      <span className="font-semibold text-emerald-600">Resuelta</span>
                    ) : (
                      <span className="font-semibold text-indigo-600">IA Activa</span>
                    )}
                    <span className="text-slate-400">
                      {new Date(c.lastMessageAt).toLocaleTimeString("es-MX", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Chat view */}
        <div className="flex min-h-0 flex-col lg:col-span-8">
          {!detail ? (
            <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
              Selecciona una conversación para ver el seguimiento
            </div>
          ) : (
            <>
              {/* Conversation Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">
                      {detail.contact.name || "Visitante"}
                    </span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                      {detail.channel}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {detail.contact.email || "Sin email"} · {detail.contact.phone || "Sin teléfono"}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {detail.status !== "HUMAN_HANDOFF" ? (
                    <button
                      type="button"
                      onClick={() => updateStatus("HUMAN_HANDOFF")}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
                    >
                      <Headphones className="h-3.5 w-3.5" /> Tomar control
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => updateStatus("AI_ACTIVE")}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                    >
                      <Bot className="h-3.5 w-3.5" /> Devolver a IA
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => updateStatus("RESOLVED")}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Resolver
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/50 p-5">
                {detail.messages.map((m) => {
                  const isUser = m.role === "USER";
                  const isHuman = m.role === "HUMAN_AGENT";
                  return (
                    <div
                      key={m.id}
                      className={`flex items-end gap-2 ${isUser ? "justify-start" : "justify-end"}`}
                    >
                      {isUser && (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                          <User className="h-3.5 w-3.5" />
                        </div>
                      )}
                      <div
                        className={`max-w-[75%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                          isUser
                            ? "bg-white text-slate-800 shadow-sm ring-1 ring-slate-200"
                            : isHuman
                            ? "bg-amber-500 text-white"
                            : "bg-indigo-600 text-white"
                        }`}
                      >
                        <div className="mb-1 text-[10px] font-semibold opacity-75">
                          {isUser ? "Cliente" : isHuman ? "Asesor Humano" : "Agente IA"}
                          {m.tokensInput + m.tokensOutput > 0 &&
                            ` · ${m.tokensInput + m.tokensOutput} tok`}
                        </div>
                        {m.content}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Human Reply Form */}
              <form
                onSubmit={sendHumanReply}
                className="flex items-center gap-2 border-t border-slate-200 bg-white p-3.5"
              >
                <input
                  type="text"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Responder como asesor humano (pausa la IA automáticamente)..."
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={sending || !reply.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" /> Enviar
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
