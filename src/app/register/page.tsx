"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bot, Loader2 } from "lucide-react";
import { INDUSTRY_OPTIONS } from "@/lib/templates/industries";

function toSlug(val: string) {
  return val
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 35);
}

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [slug, setSlug] = useState("");
  const [industry, setIndustry] = useState("clinic");
  const [timezone, setTimezone] = useState("America/Mexico_City");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          businessName,
          slug: slug || toSlug(businessName),
          timezone,
          industry,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo completar el registro");
        setLoading(false);
        return;
      }
      router.push(`/dashboard/${data.tenant.slug}`);
    } catch {
      setError("Error de conexión con el servidor");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Crea tu workspace multi-tenant</h1>
            <p className="text-xs text-slate-500">
              Obtén tu subdominio propio y agente de IA preconfigurado para tu rubro
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Tu nombre</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ana García"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Correo</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ana@minegocio.com"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Contraseña</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Nombre del negocio
            </label>
            <input
              type="text"
              required
              value={businessName}
              onChange={(e) => {
                setBusinessName(e.target.value);
                setSlug(toSlug(e.target.value));
              }}
              placeholder="Clínica Dental Sonrisa"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Rubro / Plantilla inicial
            </label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              {INDUSTRY_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label} — {opt.description}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Subdominio del negocio
            </label>
            <div className="flex items-center overflow-hidden rounded-lg border border-slate-300 focus-within:border-indigo-500">
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(toSlug(e.target.value))}
                placeholder="mi-negocio"
                className="w-full px-3 py-2 text-sm focus:outline-none"
              />
              <span className="border-l border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                .{rootDomain}
              </span>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Zona horaria</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="America/Mexico_City">America/Mexico_City (CDMX)</option>
              <option value="America/Monterrey">America/Monterrey</option>
              <option value="America/Bogota">America/Bogota</option>
              <option value="America/Lima">America/Lima</option>
              <option value="America/Santiago">America/Santiago</option>
              <option value="America/Argentina/Buenos_Aires">America/Buenos_Aires</option>
              <option value="Europe/Madrid">Europe/Madrid</option>
              <option value="America/New_York">America/New_York</option>
            </select>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Crear workspace y entrar
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500">
          Al registrarte aceptas los{" "}
          <Link href="/terms" className="underline hover:text-indigo-600">
            Términos de Servicio
          </Link>{" "}
          y la{" "}
          <Link href="/privacy" className="underline hover:text-indigo-600">
            Política de Privacidad
          </Link>
          .
        </p>

        <p className="mt-4 text-center text-sm text-slate-600">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-semibold text-indigo-600 hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
