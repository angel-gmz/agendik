import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const plans = [
    {
      code: "FREE",
      name: "Starter Free",
      description: "Ideal para probar el agente de IA con widget web y citas básicas.",
      priceMonthlyCents: 0,
      currency: "MXN",
      monthlyMessageLimit: 500,
      monthlyTokenLimit: 500_000,
      maxChannels: 2,
      maxKnowledgeDocs: 5,
      maxTeamMembers: 1,
      allowByok: false,
      allowGoogleCalendar: true,
    },
    {
      code: "PRO",
      name: "Pro Omnicanal",
      description: "Para negocios en crecimiento con WhatsApp, Instagram, Messenger y BYOK.",
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
    {
      code: "ENTERPRISE",
      name: "Enterprise",
      description: "Alto volumen, dominios personalizados y soporte dedicado.",
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
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { code: plan.code },
      update: {},
      create: plan,
    });
  }

  console.log("[seed-plans] Base SaaS plans ensured (FREE, PRO, ENTERPRISE).");
}

main()
  .catch((err) => {
    console.error("[seed-plans] Error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
