# Product Marketing Context

**Document version:** v3
**Last updated:** 2026-11-27

## Product Overview
**One-liner:** Atendik es el recepcionista con IA para clínicas, consultorios y spas en México que responde dudas frecuentes y agenda citas 24/7 en Google Calendar por WhatsApp, Instagram, Messenger y tu sitio web.
**What it does:** Atendik permite a clínicas médicas, dentales, consultorios, spas y negocios de citas en México activar en minutos un recepcionista virtual entrenado con sus propios precios, tratamientos, FAQs y PDFs. Atiende pacientes y clientes 24/7 por WhatsApp, Instagram DM, Messenger y widget web; consulta disponibilidad real en Google Calendar para agendar, reprogramar o cancelar citas sin dobles reservas, y entrega la conversación al equipo de recepción en 1 clic desde un inbox compartido cuando se requiere trato humano.
**Product category:** Recepcionista con IA y Agendamiento Omnicanal para Clínicas y Negocios de Citas en México (AI Receptionist & WhatsApp Appointment Booking SaaS).
**Product type:** SaaS B2B Multi-Tenant (self-serve con prueba gratis de 14 días sin tarjeta y suscripciones mensuales en MXN vía Mercado Pago).
**Business model:** Free Trial de 14 días sin tarjeta + 3 planes de pago en MXN con Mercado Pago (Good-Better-Best):
- **Consultorio ($499 MXN/mes):** 1,500 mensajes IA/mes, hasta 2 canales activos (Web + WhatsApp), 15 documentos + FAQs, Google Calendar integrado, hasta 2 personas en el equipo.
- **Clínica Pro ($799 MXN/mes — Recomendado):** 5,000 mensajes IA/mes, hasta 4 canales (Web + WhatsApp/Instagram/Messenger), 50 documentos + FAQs, hasta 5 recepcionistas/asesores, Google Calendar + recordatorios y opción BYOK (tu propia API Key de OpenAI o Gemini).
- **Red y Agencias ($2,999 MXN/mes):** 50,000 mensajes IA/mes, hasta 10 canales, 500 documentos, hasta 25 miembros de equipo, dominio personalizado, BYOK y soporte prioritario.

## Target Audience
**Target companies:**
- **Cuña principal (Beachhead ICP):** Clínicas dentales, consultorios médicos, clínicas estéticas, fisioterapia, psicología, spas, barberías y centros de bienestar en México (1 a 15 especialistas/sillas) que agendan por WhatsApp/Instagram y cuyo ticket promedio por cita ($500–$2,000+ MXN) hace que una sola cita recuperada pague la suscripción mensual.
- **Verticales secundarias soportadas (con plantillas listas):** Inmobiliarias (visitas a propiedades), restaurantes (reservaciones de mesas) y despachos/consultorías B2B (llamadas de diagnóstico).
**Decision-makers:** Dueños de clínica o consultorio, directores médicos/administrativos, fundadores de spas/estéticas y coordinadores de recepción.
**Primary use case:** Dejar de perder pacientes y clientes que escriben fuera de horario o cuando recepción está ocupada, convirtiendo mensajes de WhatsApp, Instagram y web en citas confirmadas en Google Calendar.
**Jobs to be done:**
- Responder en segundos precios, ubicación, preparación para consulta, seguros y horarios en WhatsApp, Instagram y web sin saturar a recepción.
- Agendar, reprogramar y cancelar citas directamente en Google Calendar con disponibilidad real y recordatorios automáticos para reducir inasistencias.
- Mantener el trato cálido y humano: que la IA resuelva lo repetitivo y escale al equipo en 1 clic ante urgencias o casos delicados.
**Use cases:**
- Un paciente con dolor de muela o buscando valoración escribe a las 10:30 p. m. por WhatsApp; Atendik le resuelve dudas de costo y ubicación y le deja su consulta agendada en Google Calendar para mañana a las 10:00 a. m.
- Una clienta pregunta por Instagram DM cuánto dura un facial y qué horarios hay el sábado; Atendik verifica espacios libres reales y reserva su cita al instante.
- Un paciente pregunta algo clínico específico o pide hablar con recepción; Atendik nunca da diagnósticos médicos, alerta al equipo y permite tomar el control del chat con un clic.

## Personas
| Persona | Cares about | Challenge | Value we promise |
|---------|-------------|-----------|------------------|
| **Dueño de Clínica / Spa** (Decision Maker & Financial Buyer) | Llenar la agenda, no perder pacientes por tardar en contestar y pagar un precio justo en MXN sin depender de agencias. | Pierde citas de gente que escribe de noche o en fin de semana; las agencias de IA le cotizan $15,000+ MXN de setup y los bots de menú hacen enojar a sus pacientes. | Un recepcionista IA 24/7 desde $0 MXN (y Pro en $799 MXN/mes con Mercado Pago) que se paga solo con la primera cita recuperada del mes. |
| **Recepcionista / Coordinadora de Citas** (User) | Quitarse de encima 50 mensajes repetitivos al día, evitar dobles reservas y poder intervenir fácil cuando el paciente lo necesita. | Atiende llamadas, pacientes en mostrador y WhatsApp al mismo tiempo; se le escapan mensajes y pierde horas reprogramando citas a mano. | La IA filtra dudas frecuentes y actualiza Google Calendar en tiempo real; ella solo entra al inbox con un clic cuando el caso requiere atención humana. |
| **Agencia / Implementador Técnico** (Secondary Champion) | Desplegar rápido para varios clientes, control de costos y aislamiento por negocio. | Mantener flujos frágiles en n8n/ManyChat para cada clínica consume demasiado soporte. | Workspaces multi-tenant con subdominio propio, plantillas de industria y opción BYOK (OpenAI/Gemini). |

## Problems & Pain Points
**Core problem:** Las clínicas, consultorios y spas en México pierden pacientes todos los días porque nadie contesta rápido por WhatsApp o Instagram cuando recepción está ocupada o fuera de horario, mientras el equipo pierde horas respondiendo siempre las mismas preguntas y moviendo citas a mano.
**Why alternatives fall short:**
- **Contestar manualmente por WhatsApp Business:** No cubre noches ni fines de semana, depende de que recepción tenga tiempo y provoca huecos o dobles reservas.
- **Bots de menú rígido ("Escribe 1 para precios, 2 para citas"):** Se sienten fríos y robóticos, frustran al paciente y no entienden preguntas naturales ni horarios reales.
- **Agencias de automatización con IA (n8n/Make):** Cobran $10,000–$25,000 MXN de setup + mantenimiento mensual, tardan semanas y dejan al negocio dependiente de terceros sin un inbox propio.
- **Plataformas globales en dólares (ManyChat, Kommo, Intercom):** Precios en USD, interfaz pensada para marketers técnicos y obligan a pegar Calendly + Zapier para agendar citas.
**What it costs them:** Pacientes que se van con la competencia por no recibir respuesta en 5 minutos, horarios vacíos por cancelaciones sin reprogramar y un equipo de recepción quemado contestando "¿cuánto cuesta la valoración?".
**Emotional tension:** Frustración de invertir en anuncios o redes sociales para que los leads se enfríen en WhatsApp, y miedo a poner un bot que suene robótico o dé mala imagen a la clínica.

## Competitive Landscape
**Direct:** Plataformas de chatbots IA para WhatsApp y citas (Kommo + bots, Respond.io, Tidio, Chatbase, Botslovers, software de agendas médicas con bots básicos) — cobran en USD, cobran extra por usuario/canal o separan la IA del calendario real.
**Secondary:** Agencias de automatización (n8n, Make, ManyChat) — alto costo inicial en MXN, semanas de espera, sin panel de inbox ni mantenimiento self-serve.
**Indirect:** Recepcionista adicional de medio tiempo / tiempo completo ($8,000–$15,000 MXN/mes + prestaciones) o formularios web tradicionales que casi nadie llena en México (donde el cliente prefiere WhatsApp).

## Differentiation
**Key differentiators:**
- **Cierra citas reales en Google Calendar (no solo contesta chats):** Consulta disponibilidad real, agenda, reprograma y cancela validando al titular, con recordatorios automáticos.
- **Pensado para clínicas, consultorios y spas en México:** Plantillas listas con tono empático, reglas de seguridad (nunca da diagnósticos médicos), precios en MXN y pago con Mercado Pago.
- **IA + Traspaso humano en 1 clic:** Inbox omnicanal compartido donde tu equipo supervisa en vivo, recibe alertas cuando la IA escala un caso y toma el control sin que el paciente cambie de chat.
- **Empieza gratis hoy, sin agencias ni código:** Plan Starter Free ($0 MXN) y simulador integrado para probar cómo responde tu agente con tus propios precios y PDFs antes de conectar WhatsApp.
- **Omnicanal real a precio fijo en MXN:** Widget web, página pública, WhatsApp, Instagram DM y Messenger desde $799 MXN/mes con hasta 5 asesores incluidos (sin cobrar por asiento).
**How we do it differently:** Unificamos en una sola herramienta en español lo que otros te obligan a armar con 4 suscripciones en dólares: respuestas entrenadas con tus documentos, agenda real en Google Calendar e inbox con traspaso humano.
**Why that's better:** Se configura en minutos sin contratar a una agencia, el paciente resuelve su duda y queda agendado en la misma conversación, y una sola cita recuperada paga el mes completo.
**Why customers choose us:** Porque pueden probarlo gratis al instante, entienden el precio en pesos mexicanos desde el primer segundo y mantienen control humano total sobre la atención al paciente.

## Objections
| Objection | Response |
|-----------|----------|
| "¿Y si la IA inventa precios o da un diagnóstico médico?" | Atendik responde únicamente con tus FAQs, documentos cargados y horarios reales de Google Calendar. En clínicas incluye reglas estrictas para nunca dar diagnósticos médicos y escalar urgencias a un humano de inmediato. |
| "Mis pacientes valoran el trato humano y odian los bots" | Atendik conversa de forma natural y empática (sin menús rígidos de "presiona 1") y permite a tu recepción tomar el control del chat con un clic desde el inbox cuando un paciente necesita trato personal. |
| "Conectar WhatsApp y entrenar una IA suena muy técnico" | Empiezas con nuestra plantilla de Clínica o Spa en minutos, subes tu lista de precios/servicios y pruebas todo en el simulador integrado antes de publicarlo. |
| "Ya me cotizaron bots carísimos o en dólares" | Empiezas gratis ($0 MXN) sin tarjeta y el plan Pro Omnicanal cuesta $799 MXN/mes con Mercado Pago e incluye hasta 5 personas de tu equipo. Una sola consulta recuperada paga el mes. |

**Anti-persona:**
- Hospitales corporativos o call centers masivos que exigen integraciones legacy (SAP, expediente clínico HL7/FHIR on-premise, telefonía IVR de voz).
- Tiendas de e-commerce masivo cuyo dolor principal es rastreo logístico y devoluciones de miles de SKUs.

## Switching Dynamics
**Push:** Ver mensajes sin contestar de la noche anterior en el WhatsApp de la clínica, perder pacientes que ya habían preguntado por una cita y tener a recepción colapsada.
**Pull:** Tener un recepcionista IA que contesta en segundos con el tono cálido de la clínica, llena el Google Calendar automáticamente y se puede probar gratis hoy mismo.
**Habit:** Seguir contestando a mano en WhatsApp Business con respuestas rápidas y anotando citas en libreta o a mano en Google Calendar.
**Anxiety:** Miedo a que la IA dé información equivocada a un paciente, que suene fría/robótica o que sea difícil conectar WhatsApp Business.

## Customer Language
**How they describe the problem:**
- *[Por completar con frases textuales de entrevistas reales a dueños de clínicas/spas]*
- Hipótesis inicial: "Me escriben a las 10 de la noche preguntando cuánto cuesta la valoración y para cuando contestamos al otro día ya agendaron en otra clínica."
- Hipótesis inicial: "Mi recepcionista se la pasa todo el día contestando lo mismo por WhatsApp y se le van mensajes."
**How they describe us:**
- *[Por completar con frases textuales de clientes reales]*
**Words to use:** recepcionista con IA, dejar de perder citas, responder en segundos 24/7, WhatsApp / Instagram / Messenger, agenda directa en Google Calendar, traspaso humano en 1 clic, empieza gratis hoy, precios en MXN con Mercado Pago, sin agencias ni código.
**Words to avoid:** "multi-tenant", "pgvector", "RAG", "webhooks", "embeddings", "BYOK" en copy para dueños de clínicas/spas (reservar términos técnicos únicamente para documentación o sección de agencias/Enterprise). Evitar también clichés como "revoluciona tu negocio" o "chatbot de última generación".
**Glossary:**
| Term | Meaning |
|------|---------|
| **Atendik** | Nombre oficial de la marca. |
| **Recepcionista con IA** | Término orientado al cliente para el agente virtual que responde dudas y gestiona citas. |
| **Base de conocimiento (FAQs + Documentos)** | Lista de precios, servicios, políticas y PDFs de la clínica/spa que Atendik usa para responder con precisión. |
| **Traspaso humano en 1 clic** | Pausar la IA en el inbox para que recepción responda directamente y devolver el control a la IA cuando termine. |

## Brand Voice
| Attribute | Means | Doesn't mean | Example line |
|-----------|-------|--------------|--------------|
| **Directo y enfocado en citas** | Hablar en términos de pacientes atendidos, citas agendadas y tiempo ahorrado. | Jerga de ingeniería o promesas vacías de IA. | "Deja de perder citas por contestar tarde en WhatsApp." |
| **Cercano y confiable (México)** | Español natural de México, trato de "tú", cálido pero profesional. | Modismos forzados ni tono corporativo frío. | "Empieza gratis hoy y actualiza en un clic cuando necesites más volumen o canales." |
| **Transparente y sin humo** | Precios visibles en MXN, límites claros y control humano siempre presente. | Ocultar precios tras "agendar demo" o prometer magia sin supervisión. | "Supervisa conversaciones en vivo, recibe alertas cuando la IA escala un caso y toma el control con un clic." |

**Tone by context:**
- **Support:** Resolutivo, paciente y paso a paso, sin tecnicismos.
- **Launch:** Práctico y demostrable: invitar siempre a probar el chat demo de clínica en vivo.
- **Errors:** Claro, honesto y con el siguiente paso concreto.
- **Sales:** Consultivo, enfocado en ROI simple (una cita recuperada paga el mes).
- **Social:** Casos prácticos de clínicas, dentistas y spas mostrando conversaciones reales de WhatsApp → cita en Google Calendar.
**Terms we own:** Atendik, Pro Omnicanal, Traspaso humano en 1 clic.
**Never use (and why):**
- Jerga técnica cruda ("pgvector", "multi-tenant", "RAG") en titulares comerciales para clínicas/spas (espanta al comprador no técnico).
- Prometer "reemplaza a tu recepcionista" (genera rechazo interno; el mensaje es *liberar* a recepción de lo repetitivo para que atienda mejor a los pacientes).

## Proof Points
**Metrics:** *[Por completar: ej. tiempo promedio de configuración, % de chats resueltos por IA, citas agendadas fuera de horario]*
**Customers:** *[Por completar: primeras clínicas/spas piloto]*
**Testimonials:**
> *"[Por completar con testimonios reales de clínicas o spas]" — [Nombre, clínica/spa]*
**Value themes:**
| Theme | Proof |
|-------|-------|
| Respuesta inmediata 24/7 | Chat demo interactivo de clínica en vivo (`/chat/clinica-demo`) y simulador omnicanal integrado. |
| Agenda real sin dobles reservas | Sincronización bidireccional con Google Calendar (disponibilidad real + agendar, reprogramar y cancelar). |
| Trato humano garantizado | Inbox compartido con toma de control en 1 clic y reglas por industria (ej. no dar diagnósticos médicos). |
| ROI obvio en MXN | Plan gratuito permanente y Pro Omnicanal en $799 MXN/mes con Mercado Pago (una cita recuperada paga el mes). |

## Goals
**Business goal:** *[Por completar: ej. conseguir X clínicas/spas activos en plan Free y Y clientes en Pro Omnicanal en 90 días]*
**Conversion action:** Registro gratuito self-serve (`/register` — "Crear cuenta gratis") o probar el chat demo (`/chat/clinica-demo`), activar el primer agente con plantilla de Clínica/Spa y pasar a **Pro Omnicanal ($799 MXN/mes)**.
**Current metrics:** *[Por completar: visitantes mensuales, tasa de registro, activación y conversión Free → Pro]*

## Paid Ads (optional)
*[Sección pendiente — completar cuando se activen campañas en Meta Ads / Google Ads para clínicas y spas en México.]*

## Learnings
*Decisions and tested lessons. Newest first. Keep it to about 20 active entries.*
| Date | Learning | Evidence | Applies to | Status |
|------|----------|----------|------------|--------|
| 2026-11-27 | Eliminar el plan "Gratis para siempre" (Freemium) y pasar a Prueba Gratis de 14 días sin tarjeta + 3 planes de pago ($499 / $799 / $2,999 MXN). | Costo marginal por tokens de IA, ausencia de efecto viral y mayor percepción de valor B2B en clínicas/spas. | Pricing, landing, signup, ads, cold-email | active |
| 2026-11-27 | Posicionar la marca oficialmente como **Atendik** con cuña principal en clínicas, consultorios y spas en México (Ángulo A), evitando jerga técnica en copy comercial. | Decisión estratégica de posicionamiento para diferenciarse de agencias de n8n y chatbots genéricos en USD. | Landing, ads, emails, social | active |

## Changelog
*Newest first. One line per revision: what changed and why.*
- v3 (2026-11-27) — Replaced permanent Freemium tier with 14-day no-card Free Trial and 3 paid tiers ($499 Consultorio / $799 Clínica Pro / $2,999 Red y Agencias MXN) to protect B2B value perception and unit economics.
- v2 (2026-11-27) — Repositioned brand as **Atendik** focused on Mexican clinics, medical offices, and spas (Angle A: AI receptionist for WhatsApp/IG/Web + Google Calendar booking, MXN pricing, anti-agency/anti-rigid-bot framing); removed developer jargon from customer-facing language.
- v1 (2026-11-27) — Initial context auto-drafted from codebase (`README.md`, landing page, pricing plans, entitlements, and industry templates).
