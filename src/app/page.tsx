import Link from "next/link";
import {
  Bot,
  CalendarCheck,
  MessageSquare,
  Users,
  ShieldCheck,
  ArrowRight,
  Clock,
  Check,
  X,
  FileText,
  ChevronDown,
  Sparkles,
  CheckCircle2,
  UserCheck,
} from "lucide-react";

const BENEFITS = [
  {
    icon: MessageSquare,
    title: "WhatsApp, Instagram y tu sitio web",
    desc: "Atiende mensajes en WhatsApp Business, Instagram DM, Messenger y el chat de tu página las 24 horas, incluso de noche y en fines de semana.",
  },
  {
    icon: CalendarCheck,
    title: "Agenda real en Google Calendar",
    desc: "Consulta tus horarios libres, agenda, reprograma y cancela citas validando al titular para evitar empalmes en tu calendario.",
  },
  {
    icon: FileText,
    title: "Entrenado con tus precios y PDFs",
    desc: "Carga tus servicios, políticas, preguntas frecuentes o tu sitio web. En salud sigue reglas estrictas para escalar urgencias y abstenerse de dar diagnósticos médicos.",
  },
  {
    icon: Users,
    title: "Tu recepción entra con un clic",
    desc: "Supervisa las conversaciones en vivo desde un inbox compartido, recibe alertas cuando un paciente pide atención personal y responde en el mismo chat.",
  },
  {
    icon: Clock,
    title: "Pruébalo antes de conectarlo",
    desc: "Elige una plantilla lista para clínica o spa, sube tus servicios y conversa con tu recepcionista en el simulador integrado antes de abrirlo al público.",
  },
  {
    icon: ShieldCheck,
    title: "Cobro transparente en MXN",
    desc: "Suscripciones en pesos mexicanos con Mercado Pago. Incluye acceso para tu equipo de recepción y opción de conectar tu propia API Key de OpenAI o Gemini.",
  },
];

const PLANS = [
  {
    name: "Consultorio",
    price: "$499",
    period: "MXN / mes",
    badge: null,
    desc: "Para consultorios independientes o especialistas que quieren automatizar su agenda.",
    highlight: false,
    features: [
      "1,500 mensajes de IA al mes",
      "Hasta 2 canales activos (Web + WhatsApp)",
      "15 documentos + preguntas frecuentes",
      "Sincronización real con Google Calendar",
      "Hasta 2 personas en tu equipo",
    ],
    cta: "Empezar prueba de 14 días",
  },
  {
    name: "Clínica Pro",
    price: "$799",
    period: "MXN / mes",
    badge: "Más popular",
    desc: "Para clínicas y spas en crecimiento que atienden por WhatsApp, Instagram y Messenger.",
    highlight: true,
    features: [
      "5,000 mensajes de IA al mes",
      "Hasta 4 canales (Web + WhatsApp, IG y Messenger)",
      "50 documentos + preguntas frecuentes",
      "Hasta 5 recepcionistas o asesores incluidos",
      "Sincronización con Google Calendar y recordatorios",
      "Opción de usar tu propia API Key (OpenAI o Gemini)",
    ],
    cta: "Empezar prueba de 14 días",
  },
  {
    name: "Red y Agencias",
    price: "$2,999",
    period: "MXN / mes",
    badge: null,
    desc: "Para grupos médicos, cadenas de spas o agencias con alto volumen y marca propia.",
    highlight: false,
    features: [
      "50,000 mensajes de IA al mes",
      "Hasta 10 canales y 500 documentos",
      "Hasta 25 miembros de equipo",
      "Dominio personalizado y API Key propia",
      "Soporte prioritario de implementación",
    ],
    cta: "Empezar prueba de 14 días",
  },
];

const FAQS = [
  {
    q: "¿Qué pasa si un paciente pregunta algo médico o una urgencia?",
    a: "La plantilla de salud incluye reglas claras para abstenerse de dar diagnósticos o recetar tratamientos. Ante síntomas urgentes o dudas clínicas específicas, Atendik indica acudir a urgencias o escala la conversación de inmediato a tu equipo en el inbox.",
  },
  {
    q: "¿Mis pacientes van a sentir que hablan con un bot rígido de menús?",
    a: "Atendik conversa en español natural usando la información exacta de tu clínica, sin menús de 'presiona 1 para precios'. Además, tu recepción puede pausar la IA y responder como humano en el mismo chat con un solo clic.",
  },
  {
    q: "¿Necesito saber programar o contratar una agencia para configurarlo?",
    a: "Eliges la plantilla de tu giro, subes tus servicios o PDFs y conectas tu Google Calendar en minutos. Antes de vincular WhatsApp puedes probar todo en el simulador incluido.",
  },
  {
    q: "¿Qué pasa al terminar los 14 días de prueba gratis?",
    a: "No pedimos tarjeta al registrarte. Si decides continuar, eliges el plan que mejor se ajuste a tu clínica y pagas en pesos mexicanos con Mercado Pago. Puedes cancelar o cambiar de plan cuando quieras.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 shadow-sm shadow-indigo-600/20">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">Atendik</span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <a href="#como-funciona" className="transition hover:text-slate-900">
              Cómo funciona
            </a>
            <a href="#comparativa" className="transition hover:text-slate-900">
              Por qué Atendik
            </a>
            <a href="#precios" className="transition hover:text-slate-900">
              Precios
            </a>
            <a href="#faq" className="transition hover:text-slate-900">
              Preguntas frecuentes
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <Link
              href="/login"
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Probar 14 días gratis
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-b from-slate-50/80 via-white to-white">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-12 lg:py-24">
            {/* Left copy */}
            <div className="lg:col-span-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3.5 py-1 text-xs font-semibold text-indigo-700">
                <Sparkles className="h-3.5 w-3.5" />
                Para clínicas, consultorios y spas en México
              </div>

              <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:leading-[1.1]">
                Deja de perder citas por{" "}
                <span className="text-indigo-600">contestar tarde en WhatsApp</span>
              </h1>

              <p className="mt-5 text-base leading-relaxed text-slate-600 sm:text-lg">
                Atendik responde precios, horarios y dudas con la información real de tu clínica y
                agenda directo en Google Calendar las 24 horas. Cuando un paciente necesita trato
                personal, tu recepción toma el chat con un clic.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3.5">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700"
                >
                  Probar 14 días gratis
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/chat/clinica-demo"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  Probar chat demo de clínica
                </Link>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  14 días con acceso completo
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Sin tarjeta de crédito
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Precios en MXN
                </span>
              </div>
            </div>

            {/* Right visual mockup: WhatsApp chat -> Google Calendar booking */}
            <div className="lg:col-span-6">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
                  {/* Mockup header */}
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-5 py-3.5 text-white">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                        <Bot className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">Clínica Dental Sonrisa</div>
                        <div className="flex items-center gap-1.5 text-[11px] text-emerald-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          Atendiendo por WhatsApp · 10:34 p. m.
                        </div>
                      </div>
                    </div>
                    <span className="rounded-md bg-white/10 px-2.5 py-1 text-[11px] font-medium text-slate-200">
                      IA activa
                    </span>
                  </div>

                  {/* Chat messages */}
                  <div className="space-y-3.5 bg-slate-50/70 p-5 text-sm">
                    <div className="flex justify-end">
                      <div className="max-w-[82%] rounded-2xl rounded-tr-sm bg-indigo-600 px-4 py-2.5 text-white shadow-sm">
                        Hola, ¿cuánto cuesta una consulta de valoración y tienen espacio mañana en
                        la mañana?
                        <div className="mt-1 text-right text-[10px] text-indigo-200">10:34 p. m.</div>
                      </div>
                    </div>

                    <div className="flex justify-start">
                      <div className="max-w-[86%] rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-2.5 text-slate-700 shadow-sm">
                        Hola. La consulta de valoración cuesta <strong>$600 MXN</strong> (dura 30
                        min) e incluye plan de tratamiento. Mañana tenemos espacio a las{" "}
                        <strong>10:00 a. m.</strong> y <strong>11:30 a. m.</strong> ¿Cuál horario te
                        acomoda mejor?
                        <div className="mt-1 text-[10px] text-slate-400">10:34 p. m. · Atendik</div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-indigo-600 px-4 py-2.5 text-white shadow-sm">
                        A las 10:00 a. m. por favor, a nombre de Laura Méndez.
                        <div className="mt-1 text-right text-[10px] text-indigo-200">10:35 p. m.</div>
                      </div>
                    </div>

                    {/* Confirmed calendar card */}
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-3.5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
                          <CalendarCheck className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-emerald-900">
                            Cita confirmada en Google Calendar
                          </div>
                          <div className="mt-0.5 text-xs text-emerald-800">
                            Consulta de Valoración · Laura Méndez · Mañana 10:00 a. m.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Inbox handoff bar */}
                  <div className="flex items-center justify-between border-t border-slate-200 bg-white px-5 py-3 text-xs">
                    <span className="inline-flex items-center gap-1.5 text-slate-500">
                      <UserCheck className="h-4 w-4 text-indigo-600" />
                      Supervisión en vivo desde tu inbox
                    </span>
                    <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-semibold text-slate-700">
                      Tomar control humano
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Verticals bar */}
          <div className="border-t border-slate-100 bg-slate-50/60">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-6 py-4 text-xs font-medium text-slate-500">
              <span className="font-semibold text-slate-700">Plantillas listas para:</span>
              <span>Clínicas dentales</span>
              <span>Consultorios médicos</span>
              <span>Spas y estéticas</span>
              <span>Psicología y fisioterapia</span>
              <span>Inmobiliarias y consultorías</span>
            </div>
          </div>
        </section>

        {/* Benefits Grid */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Todo lo que recepción necesita en un solo lugar
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Atiende dudas frecuentes, llena tu agenda y mantén el control humano sin pegar cuatro
              herramientas distintas.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Comparison: Today vs Atendik */}
        <section id="comparativa" className="border-y border-slate-200/80 bg-slate-50 py-20">
          <div className="mx-auto max-w-5xl px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                Por qué las clínicas cambian a Atendik
              </h2>
              <p className="mt-3 text-base text-slate-600">
                Compara cómo se manejan hoy los mensajes y citas frente a tener tu recepcionista
                virtual conectado a Google Calendar.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-7">
                <h3 className="text-base font-bold text-slate-900">
                  WhatsApp manual o bots de menú
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Lo que hoy hace perder citas fuera de horario
                </p>
                <ul className="mt-6 space-y-3.5 text-sm text-slate-600">
                  {[
                    "Pacientes que escriben de noche esperan hasta el día siguiente",
                    "Recepción contesta las mismas preguntas 50 veces al día",
                    "Menús rígidos de 'presiona 1' que frustran al paciente",
                    "Agencias de automatización que cobran $10,000+ MXN de setup",
                    "Herramientas en dólares donde hay que conectar Calendly aparte",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border-2 border-indigo-600 bg-white p-7 shadow-lg shadow-indigo-600/5">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">Con Atendik</h3>
                  <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                    Listo en minutos
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Recepcionista con IA + tu equipo en el mismo inbox
                </p>
                <ul className="mt-6 space-y-3.5 text-sm text-slate-700">
                  {[
                    "Responde en segundos las 24 horas en WhatsApp, Instagram y web",
                    "Agenda, reprograma y cancela directo en tu Google Calendar real",
                    "Conversa de forma natural con tus propios precios y PDFs",
                    "Tu recepción toma el control del chat en 1 clic cuando hace falta",
                    "Prueba gratis 14 días y planes claros en MXN con Mercado Pago",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="como-funciona" className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Enciende tu recepcionista virtual hoy mismo
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Configúralo tú mismo en tres pasos y comprueba cómo atiende antes de abrirlo a tus
              pacientes.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Carga tus servicios y horarios",
                desc: "Elige la plantilla de clínica o spa, sube tu lista de precios o PDFs y vincula tu Google Calendar.",
              },
              {
                step: "2",
                title: "Pruébalo en el simulador",
                desc: "Hazle preguntas reales como paciente y verifica cómo agenda, reprograma o escala una conversación.",
              },
              {
                step: "3",
                title: "Conecta WhatsApp y tu página",
                desc: "Agrega el widget a tu sitio web o vincula tus canales de Meta para atender 24/7 desde un solo inbox.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white">
                  {item.step}
                </div>
                <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing Section */}
        <section id="precios" className="border-t border-slate-200/80 bg-slate-50 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-800">
                14 días de prueba gratis en todos los planes · Pagos con Mercado Pago
              </span>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                Una sola cita recuperada paga el mes
              </h2>
              <p className="mt-3 text-base text-slate-600">
                Prueba Atendik con tus propios horarios sin ingresar tarjeta. Cambia de plan o
                cancela cuando quieras.
              </p>
            </div>

            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative flex flex-col rounded-2xl p-7 ${
                    plan.highlight
                      ? "border-2 border-indigo-600 bg-white shadow-xl shadow-indigo-600/10"
                      : "border border-slate-200 bg-white shadow-sm"
                  }`}
                >
                  {plan.badge && (
                    <span className="absolute -top-3 right-6 rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-semibold text-white">
                      {plan.badge}
                    </span>
                  )}
                  <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                  <p className="mt-1.5 text-sm text-slate-600">{plan.desc}</p>
                  <div className="mt-6 flex items-baseline gap-1.5">
                    <span className="text-4xl font-extrabold tracking-tight text-slate-900">
                      {plan.price}
                    </span>
                    <span className="text-xs font-medium text-slate-500">{plan.period}</span>
                  </div>
                  <ul className="mt-6 flex-1 space-y-3 text-sm text-slate-700">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/register"
                    className={`mt-8 inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition ${
                      plan.highlight
                        ? "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700"
                        : "border border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-3xl px-6 py-20">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Preguntas frecuentes
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Lo que suelen preguntar directores de clínicas y spas antes de empezar su prueba.
            </p>
          </div>

          <div className="mt-10 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
            {FAQS.map((item) => (
              <details key={item.q} className="group p-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-slate-900 sm:text-base">
                  <span>{item.q}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA Banner */}
        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="rounded-3xl bg-slate-900 px-8 py-14 text-center text-white shadow-xl sm:px-14">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Prueba Atendik hoy con los horarios de tu clínica
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm text-slate-300 sm:text-base">
              Activa tu prueba gratis de 14 días sin tarjeta de crédito o entra primero al chat demo
              para ver cómo agenda una cita en vivo.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-indigo-400"
              >
                Empezar prueba de 14 días
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/chat/clinica-demo"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Probar chat demo de clínica
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8 text-xs text-slate-500">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6">
          <span>© {new Date().getFullYear()} Atendik. Todos los derechos reservados.</span>
          <div className="flex items-center gap-5">
            <Link href="/terms" className="hover:text-slate-900">
              Términos de Servicio
            </Link>
            <Link href="/privacy" className="hover:text-slate-900">
              Política de Privacidad
            </Link>
            <Link href="/login" className="hover:text-slate-900">
              Iniciar sesión
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
