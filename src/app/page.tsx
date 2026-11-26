import Link from "next/link";
import {
  Bot,
  CalendarCheck,
  MessageSquare,
  Sparkles,
  Users,
  ShieldCheck,
  ArrowRight,
  Globe,
  Check,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500 shadow-lg shadow-indigo-500/30">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">AgenteIA</span>
        </div>
        <nav className="flex items-center gap-3">
          <Link
            href="/chat/clinica-demo"
            className="hidden rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:text-white sm:inline-block"
          >
            Probar Demo Chat
          </Link>
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-400"
          >
            Crear mi workspace
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-16">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-medium text-indigo-200">
            <Sparkles className="h-3.5 w-3.5" />
            Multi-Tenant con Subdominios · Omnicanal · RAG + Citas
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
            Tu Agente de IA para{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-cyan-300 bg-clip-text text-transparent">
              dudas frecuentes y citas
            </span>{" "}
            24/7
          </h1>
          <p className="mt-6 text-lg text-slate-300">
            Atiende clientes en Widget Web, WhatsApp, Instagram y Messenger. Entrena con tus
            FAQs y documentos, sincroniza con Google Calendar y toma el control humano cuando lo
            necesites.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-indigo-500/30 transition hover:bg-indigo-400"
            >
              Crear cuenta gratis
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Entrar al Panel Demo
            </Link>
            <Link
              href="/chat/clinica-demo"
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-6 py-3.5 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/20"
            >
              Abrir Chat Público Demo
            </Link>
          </div>
        </div>

        <div className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: MessageSquare,
              title: "Omnicanal Real",
              desc: "Widget web embebible en un script, página pública por subdominio y webhooks listos para WhatsApp, Instagram DM y Messenger.",
            },
            {
              icon: CalendarCheck,
              title: "Ciclo Completo de Citas",
              desc: "Consulta disponibilidad real, agenda, reprograma y cancela citas validando al titular, con sincronización a Google Calendar.",
            },
            {
              icon: Bot,
              title: "Base de Conocimiento Híbrida",
              desc: "Combina perfil del negocio, FAQs estructuradas y documentos PDF/TXT/URL indexados en PostgreSQL + pgvector.",
            },
            {
              icon: Users,
              title: "Inbox + Traspaso Humano",
              desc: "Supervisa conversaciones en vivo, recibe alertas cuando la IA escala un caso y toma el control con un clic.",
            },
            {
              icon: Globe,
              title: "Multi-Tenant con Subdominios",
              desc: "Cada negocio obtiene su propio subdominio aislado (cliente.tudominio.com), branding, métricas y cuotas de plan.",
            },
            {
              icon: ShieldCheck,
              title: "OpenAI + Gemini y BYOK",
              desc: "Elige proveedor y modelo por tenant, mide consumo mensual de tokens o permite que cada cliente conecte su propia API Key.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Pricing Section */}
        <section id="precios" className="mt-24">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-semibold text-cyan-200">
              Suscripciones transparentes con Mercado Pago
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Planes que escalan con tu negocio
            </h2>
            <p className="mt-3 text-sm text-slate-300">
              Empieza gratis hoy y actualiza en un clic cuando necesites más volumen o canales.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {[
              {
                name: "Starter Free",
                price: "$0",
                period: "para siempre",
                desc: "Ideal para probar tu agente IA con widget web y citas básicas.",
                highlight: false,
                features: [
                  "500 mensajes IA / mes",
                  "Hasta 2 canales activos",
                  "5 documentos RAG + FAQs",
                  "Google Calendar integrado",
                ],
                cta: "Empezar gratis",
              },
              {
                name: "Pro Omnicanal",
                price: "$799 MXN",
                period: "/ mes",
                desc: "Para negocios en crecimiento con WhatsApp, Instagram, Messenger y BYOK.",
                highlight: true,
                features: [
                  "5,000 mensajes IA / mes",
                  "Hasta 4 canales (Web + Meta)",
                  "50 documentos RAG + FAQs",
                  "Hasta 5 asesores en tu equipo",
                  "BYOK (tu propia API Key)",
                ],
                cta: "Comenzar con Pro",
              },
              {
                name: "Enterprise",
                price: "$2,999 MXN",
                period: "/ mes",
                desc: "Alto volumen, dominios personalizados y soporte dedicado.",
                highlight: false,
                features: [
                  "50,000 mensajes IA / mes",
                  "Canales y documentos ampliados",
                  "Hasta 25 miembros de equipo",
                  "Dominio personalizado + BYOK",
                ],
                cta: "Crear cuenta Enterprise",
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`flex flex-col rounded-2xl border p-7 ${
                  plan.highlight
                    ? "border-indigo-400 bg-indigo-500/15 shadow-xl shadow-indigo-500/15"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                <p className="mt-1.5 text-xs text-slate-300">{plan.desc}</p>
                <div className="mt-5 flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold text-white">{plan.price}</span>
                  <span className="text-xs text-slate-400">{plan.period}</span>
                </div>
                <ul className="mt-6 flex-1 space-y-2.5 text-xs text-slate-200">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2">
                      <Check className="h-4 w-4 shrink-0 text-cyan-300" />
                      {feat}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`mt-7 inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
                    plan.highlight
                      ? "bg-indigo-500 text-white hover:bg-indigo-400"
                      : "border border-white/15 bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-8 text-center text-xs text-slate-400">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6">
          <span>© {new Date().getFullYear()} Atendik / AgenteIA. Todos los derechos reservados.</span>
          <div className="flex items-center gap-5">
            <Link href="/terms" className="hover:text-white">
              Términos de Servicio
            </Link>
            <Link href="/privacy" className="hover:text-white">
              Política de Privacidad
            </Link>
            <Link href="/login" className="hover:text-white">
              Iniciar sesión
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
