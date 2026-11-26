export interface IndustryTemplate {
  id: string;
  label: string;
  description: string;
  primaryColor: string;
  tone: string;
  systemPrompt: string;
  greetingMessage: (businessName: string) => string;
  quickPrompts: string[];
  services: Array<{
    name: string;
    description: string;
    durationMinutes: number;
    priceCents: number;
  }>;
  faqs: Array<{
    category: string;
    question: string;
    answer: string;
  }>;
}

export const INDUSTRY_TEMPLATES: Record<string, IndustryTemplate> = {
  clinic: {
    id: "clinic",
    label: "Clínica / Salud",
    description: "Consultorios médicos, dentales, psicología o fisioterapia.",
    primaryColor: "#0284c7",
    tone: "empático, claro y profesional",
    systemPrompt:
      "Eres el asistente virtual de una clínica de salud. Respondes dudas sobre servicios, costos, preparación para citas y horarios. Ayudas a agendar, reprogramar o cancelar citas. Nunca des diagnósticos médicos; ante urgencias pide acudir a emergencias o escala con un asesor humano.",
    greetingMessage: (name) =>
      `¡Hola! Soy el asistente virtual de ${name}. Puedo resolver tus dudas sobre consultas y ayudarte a agendar tu cita.`,
    quickPrompts: [
      "¿Qué consultas ofrecen?",
      "Quiero agendar una cita",
      "¿Aceptan seguros médicos?",
      "Hablar con recepción",
    ],
    services: [
      {
        name: "Consulta de Valoración",
        description: "Evaluación inicial completa y plan de tratamiento personalizado.",
        durationMinutes: 30,
        priceCents: 60000,
      },
      {
        name: "Consulta de Seguimiento",
        description: "Revisión de avances y ajustes al tratamiento.",
        durationMinutes: 30,
        priceCents: 45000,
      },
    ],
    faqs: [
      {
        category: "Pagos",
        question: "¿Qué métodos de pago aceptan?",
        answer: "Aceptamos efectivo, tarjeta de débito/crédito y transferencia bancaria.",
      },
      {
        category: "Citas",
        question: "¿Con cuánta anticipación puedo cancelar o reprogramar?",
        answer: "Puedes reprogramar o cancelar sin costo hasta 12 horas antes de tu cita.",
      },
    ],
  },
  spa: {
    id: "spa",
    label: "Spa / Barbería / Belleza",
    description: "Estéticas, barberías, nail bars y centros de bienestar.",
    primaryColor: "#db2777",
    tone: "cálido, moderno y servicial",
    systemPrompt:
      "Eres el asistente virtual de un centro de belleza y bienestar. Ayudas a conocer servicios, duración, precios y agendar citas de forma rápida y amable.",
    greetingMessage: (name) =>
      `¡Hola! Bienvenido a ${name}. ¿Qué servicio te gustaría reservar hoy?`,
    quickPrompts: [
      "Ver servicios y precios",
      "Quiero reservar un horario",
      "¿Dónde están ubicados?",
      "Hablar con un asesor",
    ],
    services: [
      {
        name: "Corte y Styling",
        description: "Servicio completo de corte, lavado y peinado.",
        durationMinutes: 45,
        priceCents: 35000,
      },
      {
        name: "Facial Relajante",
        description: "Limpieza facial profunda e hidratación.",
        durationMinutes: 60,
        priceCents: 75000,
      },
    ],
    faqs: [
      {
        category: "Reservas",
        question: "¿Necesito cita previa?",
        answer: "Recomendamos agendar cita previa para garantizarte atención sin esperas.",
      },
      {
        category: "Horarios",
        question: "¿Qué pasa si llego tarde?",
        answer: "Tenemos una tolerancia de 10 minutos para respetar los horarios de los demás clientes.",
      },
    ],
  },
  real_estate: {
    id: "real_estate",
    label: "Inmobiliaria",
    description: "Venta y renta de propiedades, desarrollos y brokers.",
    primaryColor: "#0f766e",
    tone: "profesional, consultivo y confiable",
    systemPrompt:
      "Eres el asistente inmobiliario virtual. Respondes dudas sobre propiedades, requisitos de renta o compra, financiamientos y agendas visitas o llamadas con asesores.",
    greetingMessage: (name) =>
      `¡Hola! Soy el asistente de ${name}. ¿Buscas comprar, rentar o agendar una visita a una propiedad?`,
    quickPrompts: [
      "Quiero agendar una visita",
      "Requisitos para rentar",
      "Opciones de financiamiento",
      "Hablar con un asesor",
    ],
    services: [
      {
        name: "Visita a Propiedad",
        description: "Recorrido guiado con uno de nuestros asesores inmobiliarios.",
        durationMinutes: 45,
        priceCents: 0,
      },
      {
        name: "Asesoría de Crédito Hipotecario",
        description: "Llamada o reunión para evaluar opciones de financiamiento.",
        durationMinutes: 30,
        priceCents: 0,
      },
    ],
    faqs: [
      {
        category: "Renta",
        question: "¿Cuáles son los requisitos para rentar?",
        answer: "Identificación oficial, comprobante de ingresos de los últimos 3 meses y póliza jurídica o aval.",
      },
      {
        category: "Compra",
        question: "¿Aceptan créditos Infonavit o bancarios?",
        answer: "Sí, trabajamos con créditos bancarios, Infonavit, Fovissste y recursos propios.",
      },
    ],
  },
  restaurant: {
    id: "restaurant",
    label: "Restaurante / Cafetería",
    description: "Reservaciones de mesas, menú, eventos y horarios.",
    primaryColor: "#d97706",
    tone: "hospitalario, amigable y ágil",
    systemPrompt:
      "Eres el anfitrión virtual de un restaurante. Respondes dudas sobre horarios, menú, ubicación, eventos privados y ayudas a reservar mesa.",
    greetingMessage: (name) =>
      `¡Hola! Bienvenido a ${name}. ¿Te ayudo a reservar una mesa o tienes alguna duda sobre nuestro menú?`,
    quickPrompts: [
      "Quiero reservar una mesa",
      "¿Qué horarios tienen?",
      "¿Tienen opciones vegetarianas?",
      "Eventos privados",
    ],
    services: [
      {
        name: "Reservación de Mesa (2 a 4 personas)",
        description: "Reserva tu mesa para comida o cena.",
        durationMinutes: 90,
        priceCents: 0,
      },
      {
        name: "Reservación Grupo (5+ personas)",
        description: "Mesa especial para grupos y celebraciones.",
        durationMinutes: 120,
        priceCents: 0,
      },
    ],
    faqs: [
      {
        category: "Menú",
        question: "¿Cuentan con opciones vegetarianas o sin gluten?",
        answer: "Sí, contamos con platillos vegetarianos y podemos adaptar opciones sin gluten bajo solicitud.",
      },
      {
        category: "Servicios",
        question: "¿Tienen estacionamiento?",
        answer: "Sí, contamos con estacionamiento y servicio de valet parking.",
      },
    ],
  },
  consulting: {
    id: "consulting",
    label: "Consultoría / Servicios B2B",
    description: "Agencias, despachos contables, legales, software y coaching.",
    primaryColor: "#4f46e5",
    tone: "ejecutivo, claro y orientado a resultados",
    systemPrompt:
      "Eres el asistente virtual de una firma de consultoría y servicios profesionales. Calificas brevemente las necesidades del prospecto, respondes dudas sobre servicios y agendas llamadas de descubrimiento.",
    greetingMessage: (name) =>
      `¡Hola! Soy el asistente de ${name}. Puedo contarte sobre nuestros servicios o agendar una sesión de diagnóstico.`,
    quickPrompts: [
      "¿Qué servicios ofrecen?",
      "Agendar llamada de diagnóstico",
      "¿Cómo trabajan?",
      "Hablar con un consultor",
    ],
    services: [
      {
        name: "Llamada de Diagnóstico (Discovery)",
        description: "Sesión inicial gratuita para entender tus objetivos y proponer un plan.",
        durationMinutes: 30,
        priceCents: 0,
      },
      {
        name: "Sesión de Consultoría 1:1",
        description: "Asesoría especializada con un consultor senior.",
        durationMinutes: 60,
        priceCents: 150000,
      },
    ],
    faqs: [
      {
        category: "Proceso",
        question: "¿Cómo iniciamos un proyecto?",
        answer: "Comenzamos con una llamada de diagnóstico gratuita de 30 minutos para evaluar tus necesidades y enviarte una propuesta a medida.",
      },
      {
        category: "Facturación",
        question: "¿Emiten factura fiscal?",
        answer: "Sí, todos nuestros servicios incluyen factura fiscal.",
      },
    ],
  },
};

export const INDUSTRY_OPTIONS = [
  { id: "general", label: "General / Otro negocio", description: "Configuración estándar adaptable a cualquier rubro." },
  ...Object.values(INDUSTRY_TEMPLATES).map((t) => ({
    id: t.id,
    label: t.label,
    description: t.description,
  })),
];
