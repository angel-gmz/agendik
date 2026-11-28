import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const plans = [
    {
      code: "FREE",
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
    {
      code: "PRO",
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
    {
      code: "ENTERPRISE",
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
  ];

  for (const plan of plans) {
    const { code, ...planData } = plan;
    await prisma.plan.upsert({
      where: { code },
      update: planData,
      create: plan,
    });
  }

  console.log(
    "[seed-plans] Plans synchronized: Consultorio ($499), Clínica Pro ($799), Red y Agencias ($2,999 MXN)."
  );
}

main()
  .catch((err) => {
    console.error("[seed-plans] Error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
