import Link from "next/link";
import { Bot, ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
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

        <h1 className="text-3xl font-extrabold text-slate-900">Política de Privacidad</h1>
        <p className="mt-2 text-xs text-slate-500">Última actualización: Noviembre 2026</p>

        <div className="mt-6 space-y-5 text-sm leading-relaxed text-slate-600">
          <section>
            <h2 className="text-base font-bold text-slate-900">1. Datos que recopilamos</h2>
            <p className="mt-1">
              Recopilamos únicamente los datos necesarios para operar cada workspace: correo y
              nombre de los administradores/asesores, configuración del negocio, documentos/FAQs
              subidos y los datos de contacto proporcionados por visitantes finales al conversar o
              agendar citas.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900">
              2. Integraciones de terceros (Google Calendar, Meta y Mercado Pago)
            </h2>
            <p className="mt-1">
              Los tokens de acceso de Google Calendar, Meta Cloud API y claves BYOK se almacenan
              cifrados con AES-256-GCM. El acceso a Google Calendar se utiliza exclusivamente para
              consultar disponibilidad (free/busy) y sincronizar citas agendadas por el negocio. Los
              pagos de suscripciones son procesados directamente por Mercado Pago; no almacenamos
              datos de tarjetas bancarias.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900">3. Aislamiento y seguridad</h2>
            <p className="mt-1">
              Toda la información está aislada lógicamente por workspace (`tenantId`). Puedes
              solicitar la eliminación de tu cuenta y datos asociados en cualquier momento
              escribiendo a soporte@atendik.com.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
