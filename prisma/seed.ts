import { PrismaClient, PlanCode, TenantRole, ChannelType, ConversationStatus, MessageRole, AppointmentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // 1. Plans
  const consultorioPlan = await prisma.plan.upsert({
    where: { code: PlanCode.FREE },
    update: {
      name: "Consultorio",
      description:
        "Para consultorios independientes o especialistas que quieren automatizar su agenda.",
      currency: "MXN",
      priceMonthlyCents: 49900,
      monthlyMessageLimit: 1500,
      monthlyTokenLimit: 1_500_000,
      maxChannels: 2,
      maxKnowledgeDocs: 15,
      maxTeamMembers: 2,
      allowByok: false,
      allowGoogleCalendar: true,
    },
    create: {
      code: PlanCode.FREE,
      name: "Consultorio",
      description:
        "Para consultorios independientes o especialistas que quieren automatizar su agenda.",
      priceMonthlyCents: 49900,
      currency: "MXN",
      monthlyMessageLimit: 1500,
      monthlyTokenLimit: 1_500_000,
      maxChannels: 2,
      maxKnowledgeDocs: 15,
      maxTeamMembers: 2,
      allowByok: false,
      allowGoogleCalendar: true,
    },
  });

  const proPlan = await prisma.plan.upsert({
    where: { code: PlanCode.PRO },
    update: {
      name: "Clínica Pro",
      description:
        "Para clínicas y spas en crecimiento que atienden por WhatsApp, Instagram y Messenger.",
      currency: "MXN",
      priceMonthlyCents: 79900,
      monthlyMessageLimit: 5000,
      monthlyTokenLimit: 5_000_000,
      maxChannels: 4,
      maxKnowledgeDocs: 50,
      maxTeamMembers: 5,
      allowByok: true,
      allowGoogleCalendar: true,
    },
    create: {
      code: PlanCode.PRO,
      name: "Clínica Pro",
      description:
        "Para clínicas y spas en crecimiento que atienden por WhatsApp, Instagram y Messenger.",
      priceMonthlyCents: 79900,
      currency: "MXN",
      monthlyMessageLimit: 5000,
      monthlyTokenLimit: 5_000_000,
      maxChannels: 4,
      maxKnowledgeDocs: 50,
      maxTeamMembers: 5,
      allowByok: true,
      allowGoogleCalendar: true,
    },
  });

  await prisma.plan.upsert({
    where: { code: PlanCode.ENTERPRISE },
    update: {
      name: "Red y Agencias",
      description:
        "Para grupos médicos, cadenas de spas o agencias con alto volumen y marca propia.",
      currency: "MXN",
      priceMonthlyCents: 299900,
      monthlyMessageLimit: 50000,
      monthlyTokenLimit: 50_000_000,
      maxChannels: 10,
      maxKnowledgeDocs: 500,
      maxTeamMembers: 25,
      allowByok: true,
      allowGoogleCalendar: true,
    },
    create: {
      code: PlanCode.ENTERPRISE,
      name: "Red y Agencias",
      description:
        "Para grupos médicos, cadenas de spas o agencias con alto volumen y marca propia.",
      priceMonthlyCents: 299900,
      currency: "MXN",
      monthlyMessageLimit: 50000,
      monthlyTokenLimit: 50_000_000,
      maxChannels: 10,
      maxKnowledgeDocs: 500,
      maxTeamMembers: 25,
      allowByok: true,
      allowGoogleCalendar: true,
    },
  });

  // 2. Users
  const passwordHash = await bcrypt.hash("admin1234", 10);
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@agenteia.local" },
    update: {},
    create: {
      email: "admin@agenteia.local",
      name: "Admin Demo",
      passwordHash,
      isSuperAdmin: true,
    },
  });

  // 3. Demo Tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: "clinica-demo" },
    update: {},
    create: {
      name: "Clínica Dental Sonrisa",
      slug: "clinica-demo",
      description: "Clínica dental integral con especialistas en ortodoncia, limpieza y estética dental.",
      timezone: "America/Mexico_City",
      email: "contacto@clinicasonrisa.demo",
      phone: "+52 55 1234 5678",
      website: "https://clinicasonrisa.demo",
      address: "Av. Reforma 250, Piso 4, CDMX",
      primaryColor: "#4f46e5",
      planId: proPlan.id,
    },
  });

  await prisma.tenantMembership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: adminUser.id } },
    update: {},
    create: {
      tenantId: tenant.id,
      userId: adminUser.id,
      role: TenantRole.OWNER,
    },
  });

  // 4. Agent Config
  await prisma.agentConfig.upsert({
    where: { tenantId: tenant.id },
    update: {
      provider: "GOOGLE",
      model: "gemini-3.1-flash-lite",
    },
    create: {
      tenantId: tenant.id,
      agentName: "Sofía — Asistente Dental",
      systemPrompt:
        "Eres Sofía, la asistente virtual de Clínica Dental Sonrisa. Ayudas a los pacientes a resolver dudas sobre servicios, precios, ubicación y horarios, y gestionas sus citas (consultar disponibilidad, agendar, reprogramar y cancelar). Sé cálida, clara y concisa. Nunca inventes precios ni diagnósticos médicos.",
      tone: "cálido, profesional y claro",
      greetingMessage:
        "¡Hola! Soy Sofía de Clínica Dental Sonrisa. ¿En qué te puedo ayudar hoy? Puedo responder tus dudas o ayudarte a agendar, reprogramar o cancelar una cita.",
      handoffMessage:
        "Con gusto te conecto con una persona de recepción para atender tu caso. Un asesor revisará esta conversación en breve.",
      provider: "GOOGLE",
      model: "gemini-3.1-flash-lite",
      temperature: 0.3,
      isActive: true,
      autoEscalateOnUnknown: true,
    },
  });

  // 5. Channels
  await prisma.channelConnection.upsert({
    where: { tenantId_type: { tenantId: tenant.id, type: ChannelType.WEB } },
    update: {},
    create: {
      tenantId: tenant.id,
      type: ChannelType.WEB,
      name: "Widget Web Oficial",
      isActive: true,
      widgetConfigJson: {
        position: "bottom-right",
        launcherLabel: "¿Dudas o citas?",
        subtitle: "Responde al instante 24/7",
      },
    },
  });

  await prisma.channelConnection.upsert({
    where: { tenantId_type: { tenantId: tenant.id, type: ChannelType.WHATSAPP } },
    update: {},
    create: {
      tenantId: tenant.id,
      type: ChannelType.WHATSAPP,
      name: "WhatsApp Clínica",
      isActive: true,
      webhookVerifyToken: "clinica-demo-verify-token",
    },
  });

  // 6. Services
  const existingServices = await prisma.service.count({ where: { tenantId: tenant.id } });
  let limpiezaId = "";
  if (existingServices === 0) {
    const s1 = await prisma.service.create({
      data: {
        tenantId: tenant.id,
        name: "Limpieza Dental Profunda",
        description: "Profilaxis ultrasónica, pulido y revisión general con diagnóstico.",
        durationMinutes: 45,
        priceCents: 85000,
        currency: "MXN",
        color: "#4f46e5",
      },
    });
    limpiezaId = s1.id;
    await prisma.service.createMany({
      data: [
        {
          tenantId: tenant.id,
          name: "Valoración de Ortodoncia",
          description: "Evaluación completa para brackets o alineadores invisibles.",
          durationMinutes: 30,
          priceCents: 50000,
          currency: "MXN",
          color: "#0ea5e9",
        },
        {
          tenantId: tenant.id,
          name: "Blanqueamiento Dental LED",
          description: "Sesión de blanqueamiento clínico seguro en consultorio.",
          durationMinutes: 60,
          priceCents: 240000,
          currency: "MXN",
          color: "#10b981",
        },
      ],
    });
  } else {
    const first = await prisma.service.findFirst({ where: { tenantId: tenant.id } });
    limpiezaId = first?.id ?? "";
  }

  // 7. Weekly Availability (Mon-Fri 09:00-18:00, Sat 09:00-14:00, Sun off)
  for (let day = 0; day <= 6; day++) {
    await prisma.availabilityRule.upsert({
      where: { tenantId_dayOfWeek: { tenantId: tenant.id, dayOfWeek: day } },
      update: {},
      create: {
        tenantId: tenant.id,
        dayOfWeek: day,
        startTime: "09:00",
        endTime: day === 6 ? "14:00" : "18:00",
        isActive: day !== 0,
      },
    });
  }

  // 8. FAQs
  const existingFaqs = await prisma.faqItem.count({ where: { tenantId: tenant.id } });
  if (existingFaqs === 0) {
    await prisma.faqItem.createMany({
      data: [
        {
          tenantId: tenant.id,
          category: "Horarios y Ubicación",
          question: "¿Cuál es su horario de atención y dirección?",
          answer:
            "Atendemos de lunes a viernes de 9:00 a 18:00 y sábados de 9:00 a 14:00. Estamos en Av. Reforma 250, Piso 4, CDMX. Contamos con estacionamiento con tarifa preferencial.",
        },
        {
          tenantId: tenant.id,
          category: "Pagos y Seguros",
          question: "¿Qué métodos de pago aceptan y emiten factura?",
          answer:
            "Aceptamos efectivo, tarjetas de débito/crédito (Visa, Mastercard, Amex), transferencias SPEI y meses sin intereses en tratamientos mayores a $3,000 MXN. Emitimos factura CFDI 4.0 el mismo día.",
        },
        {
          tenantId: tenant.id,
          category: "Políticas de Citas",
          question: "¿Puedo cancelar o reprogramar mi cita sin costo?",
          answer:
            "Sí, puedes reprogramar o cancelar sin costo avisando con al menos 12 horas de anticipación a través de este mismo chat.",
        },
      ],
    });
  }

  // 9. Knowledge Document
  const existingDocs = await prisma.knowledgeDocument.count({ where: { tenantId: tenant.id } });
  if (existingDocs === 0) {
    const docContent =
      "Políticas de preparación para citas en Clínica Dental Sonrisa:\n1. Llegar 10 minutos antes de la primera consulta para llenar el historial clínico.\n2. Para blanqueamiento dental LED se recomienda haberse realizado una limpieza dental en los últimos 6 meses.\n3. En caso de urgencia dental con dolor agudo, solicitar atención inmediata con un asesor humano.";
    const doc = await prisma.knowledgeDocument.create({
      data: {
        tenantId: tenant.id,
        title: "Guía del Paciente y Políticas",
        sourceType: "TEXT",
        rawContent: docContent,
        status: "READY",
        chunkCount: 1,
      },
    });
    await prisma.knowledgeChunk.create({
      data: {
        tenantId: tenant.id,
        documentId: doc.id,
        chunkIndex: 0,
        content: docContent,
      },
    });
  }

  // 10. Notification Rules
  await prisma.notificationRule.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      notifyOnBooking: true,
      notifyOnCancellation: true,
      notifyOnHandoff: true,
      sendAppointmentReminders: true,
      reminderHoursBefore: 24,
      emailRecipients: "contacto@clinicasonrisa.demo",
      whatsappRecipients: "+525512345678",
    },
  });

  // 11. Sample Contact, Conversation & Appointment
  const existingContacts = await prisma.contact.count({ where: { tenantId: tenant.id } });
  if (existingContacts === 0 && limpiezaId) {
    const contact = await prisma.contact.create({
      data: {
        tenantId: tenant.id,
        name: "María López",
        email: "maria.lopez@ejemplo.com",
        phone: "+525598765432",
        notes: "Paciente recurrente, prefiere horarios matutinos.",
      },
    });

    const conv = await prisma.conversation.create({
      data: {
        tenantId: tenant.id,
        contactId: contact.id,
        channel: ChannelType.WEB,
        status: ConversationStatus.AI_ACTIVE,
        needsHumanAttention: false,
      },
    });

    await prisma.message.createMany({
      data: [
        {
          tenantId: tenant.id,
          conversationId: conv.id,
          role: MessageRole.USER,
          content: "Hola, ¿cuánto cuesta la limpieza dental y aceptan tarjeta?",
        },
        {
          tenantId: tenant.id,
          conversationId: conv.id,
          role: MessageRole.ASSISTANT,
          content:
            "¡Hola María! La Limpieza Dental Profunda tiene un costo de $850 MXN y dura 45 minutos. Sí aceptamos tarjetas de crédito/débito, efectivo y SPEI. ¿Te gustaría que revisemos horarios disponibles para agendar?",
          tokensInput: 240,
          tokensOutput: 65,
          provider: "OPENAI",
          model: "gpt-4o-mini",
        },
      ],
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const endsAt = new Date(tomorrow.getTime() + 45 * 60 * 1000);

    await prisma.appointment.create({
      data: {
        tenantId: tenant.id,
        contactId: contact.id,
        serviceId: limpiezaId,
        conversationId: conv.id,
        startsAt: tomorrow,
        endsAt,
        status: AppointmentStatus.CONFIRMED,
        notes: "Agendada por asistente IA.",
      },
    });
  }

  console.log("Seed completed successfully!");
  console.log(`Demo login: admin@agenteia.local / admin1234`);
  console.log(`Demo tenant slug: clinica-demo (Consultorio plan id: ${consultorioPlan.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
