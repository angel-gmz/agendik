import Link from "next/link";
import { Bot, ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12 text-slate-800">
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <Bot className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold text-slate-900">Atendik / AgenteIA</span>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Volver al inicio
          </Link>
        </div>

        <h1 className="text-3xl font-extrabold text-slate-900">Términos de Servicio</h1>
        <p className="mt-2 text-xs text-slate-500">Última actualización: Noviembre 2026</p>

        <div className="mt-6 space-y-5 text-sm leading-relaxed text-slate-600">
          <section>
            <h2 className="text-base font-bold text-slate-900">1. Objeto del servicio</h2>
            <p className="mt-1">
              Atendik / AgenteIA proporciona una plataforma SaaS multi-tenant para crear y operar
              agentes de inteligencia artificial orientados a atención al cliente, resolución de
              preguntas frecuentes (RAG) y agendamiento de citas en canales web y mensajería.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900">2. Cuentas y responsabilidades</h2>
            <p className="mt-1">
              Cada cliente (tenant) es responsable de la veracidad de la información cargada en su
              base de conocimiento, del cumplimiento de las políticas de WhatsApp/Meta y Google
              Calendar cuando conecte cuentas de terceros, y de la confidencialidad de sus
              credenciales y API keys (BYOK).
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900">3. Planes, cuotas y facturación</h2>
            <p className="mt-1">
              El uso de la plataforma está sujeto a los límites mensuales del plan contratado
              (Starter Free, Pro Omnicanal o Enterprise). Las suscripciones de pago se procesan de
              forma recurrente mediante Mercado Pago y pueden cancelarse en cualquier momento desde
              el panel de facturación.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900">4. Uso aceptable</h2>
            <p className="mt-1">
              Queda prohibido utilizar la plataforma para envío de spam, suplantación de identidad,
              actividades ilícitas o intentos de evadir los límites de seguridad y rate limiting.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
