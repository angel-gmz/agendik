"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Users, UserPlus, Trash2, Copy, Check, Loader2, Shield } from "lucide-react";

interface MemberRow {
  id: string;
  role: "OWNER" | "ADMIN" | "AGENT";
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface InvitationRow {
  id: string;
  email: string;
  role: "OWNER" | "ADMIN" | "AGENT";
  token: string;
  expiresAt: string;
}

export default function TeamPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [currentRole, setCurrentRole] = useState<string>("AGENT");
  const [maxTeamMembers, setMaxTeamMembers] = useState<number>(2);
  const [planName, setPlanName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "AGENT">("AGENT");
  const [submitting, setSubmitting] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const loadTeam = useCallback(async () => {
    const res = await fetch(`/api/tenants/${tenantSlug}/team`);
    if (res.ok) {
      const data = await res.json();
      setMembers(data.members || []);
      setInvitations(data.invitations || []);
      setCurrentRole(data.currentRole || "AGENT");
      setMaxTeamMembers(data.maxTeamMembers || 2);
      setPlanName(data.planName || "");
    }
    setLoading(false);
  }, [tenantSlug]);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  const canManage = currentRole === "OWNER" || currentRole === "ADMIN";

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMsg("");
    setErr("");
    setInviteUrl("");
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/team`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "No se pudo invitar al miembro.");
      } else {
        setEmail("");
        setInviteUrl(data.inviteUrl || "");
        setMsg("Invitación creada. Comparte el enlace seguro con el asesor.");
        loadTeam();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRoleChange(membershipId: string, nextRole: string) {
    setMsg("");
    setErr("");
    const res = await fetch(`/api/tenants/${tenantSlug}/team`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ membershipId, role: nextRole }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(data.error || "No se pudo cambiar el rol.");
    } else {
      setMsg("Rol actualizado.");
      loadTeam();
    }
  }

  async function handleDelete(params: { membershipId?: string; invitationId?: string }) {
    setMsg("");
    setErr("");
    const qs = params.membershipId
      ? `membershipId=${encodeURIComponent(params.membershipId)}`
      : `invitationId=${encodeURIComponent(params.invitationId || "")}`;
    const res = await fetch(`/api/tenants/${tenantSlug}/team?${qs}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(data.error || "No se pudo eliminar.");
    } else {
      setMsg("Registro eliminado.");
      loadTeam();
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Users className="h-6 w-6 text-indigo-600" /> Equipo y Roles (RBAC)
          </h1>
          <p className="text-sm text-slate-500">
            Invita asesores para atender el Inbox y controla permisos ({members.length} /{" "}
            {maxTeamMembers} miembros en plan {planName})
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
          <Shield className="h-3.5 w-3.5" /> Tu rol: {currentRole}
        </span>
      </div>

      {msg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
          {msg}
        </div>
      )}
      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {err}
        </div>
      )}

      {canManage && (
        <form
          onSubmit={handleInvite}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <UserPlus className="h-4 w-4 text-indigo-600" /> Invitar nuevo miembro
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="asesor@tunegocio.com"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "ADMIN" | "AGENT")}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="AGENT">AGENT (Solo Inbox, Citas y Contactos)</option>
              <option value="ADMIN">ADMIN (Configuración, Canales y Billing)</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Generar enlace de invitación
          </button>

          {inviteUrl && (
            <div className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-xs">
              <code className="flex-1 truncate font-mono text-indigo-900">{inviteUrl}</code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(inviteUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 font-semibold text-white hover:bg-indigo-700"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copiado" : "Copiar"}
              </button>
            </div>
          )}
        </form>
      )}

      {/* Active members */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-slate-900">Miembros activos</h2>
        <div className="divide-y divide-slate-100">
          {members.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">{m.user.name}</div>
                <div className="text-xs text-slate-500">{m.user.email}</div>
              </div>
              <div className="flex items-center gap-2">
                {canManage ? (
                  <select
                    value={m.role}
                    onChange={(e) => handleRoleChange(m.id, e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium"
                  >
                    <option value="OWNER">OWNER</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="AGENT">AGENT</option>
                  </select>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {m.role}
                  </span>
                )}
                {canManage && m.role !== "OWNER" && (
                  <button
                    type="button"
                    onClick={() => handleDelete({ membershipId: m.id })}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    title="Remover miembro"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-slate-900">Invitaciones pendientes</h2>
          <div className="space-y-2">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2.5 text-xs"
              >
                <div>
                  <span className="font-semibold text-slate-900">{inv.email}</span>{" "}
                  <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
                    {inv.role}
                  </span>
                </div>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => handleDelete({ invitationId: inv.id })}
                    className="font-semibold text-red-600 hover:underline"
                  >
                    Revocar
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
