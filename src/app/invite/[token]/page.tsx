"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Bot, Loader2, CheckCircle2 } from "lucide-react";

interface InviteInfo {
  email: string;
  role: string;
  tenantName: string;
  tenantSlug: string;
  expired: boolean;
  accepted: boolean;
  userExists: boolean;
}

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/invitations/${token}/accept`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) setError(d.error || "Invitación inválida");
        else setInfo(d);
      })
      .finally(() => setLoading(false));
  }, [token]);

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/invitations/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo aceptar la invitación");
        setSubmitting(false);
        return;
      }
      router.push(`/dashboard/${data.tenantSlug}`);
    } catch {
      setError("Error de conexión");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Invitación al equipo</h1>
            <p className="text-xs text-slate-500">
              {info ? `Workspace: ${info.tenantName}` : "Verificando enlace"}
            </p>
          </div>
        </div>

        {!info || info.expired || info.accepted ? (
          <div className="space-y-4 text-sm text-slate-600">
            <div className="rounded-xl bg-amber-50 p-4 text-amber-800">
              {error ||
                (info?.accepted
                  ? "Esta invitación ya fue aceptada."
                  : "Esta invitación ha expirado.")}
            </div>
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Ir a iniciar sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={handleAccept} className="space-y-4">
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 text-xs text-indigo-900">
              Has sido invitado a <strong>{info.tenantName}</strong> como{" "}
              <strong>{info.role}</strong> con el correo <strong>{info.email}</strong>.
            </div>

            {!info.userExists && (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Tu nombre</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nombre completo"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {info.userExists ? "Tu contraseña actual" : "Crea una contraseña"}
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Aceptar invitación y entrar
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
