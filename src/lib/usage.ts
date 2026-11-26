import { prisma } from "./prisma";

export function getCurrentMonthKey(date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export async function getTenantUsageSummary(tenantId: string) {
  const month = getCurrentMonthKey();
  const [tenant, usage] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { plan: true },
    }),
    prisma.usageRecord.findUnique({
      where: { tenantId_month: { tenantId, month } },
    }),
  ]);

  if (!tenant) {
    throw new Error("Tenant no encontrado");
  }

  const messagesCount = usage?.messagesCount ?? 0;
  const tokensInput = usage?.tokensInput ?? 0;
  const tokensOutput = usage?.tokensOutput ?? 0;
  const totalTokens = tokensInput + tokensOutput;

  return {
    month,
    plan: tenant.plan,
    messagesCount,
    tokensInput,
    tokensOutput,
    totalTokens,
    appointmentsCreated: usage?.appointmentsCreated ?? 0,
    aiResolvedCount: usage?.aiResolvedCount ?? 0,
    humanHandoffCount: usage?.humanHandoffCount ?? 0,
    messageLimitReached: messagesCount >= tenant.plan.monthlyMessageLimit,
    tokenLimitReached: totalTokens >= tenant.plan.monthlyTokenLimit,
  };
}

export async function recordUsage(
  tenantId: string,
  delta: {
    messagesCount?: number;
    tokensInput?: number;
    tokensOutput?: number;
    appointmentsCreated?: number;
    aiResolvedCount?: number;
    humanHandoffCount?: number;
  }
) {
  const month = getCurrentMonthKey();
  await prisma.usageRecord.upsert({
    where: { tenantId_month: { tenantId, month } },
    create: {
      tenantId,
      month,
      messagesCount: delta.messagesCount ?? 0,
      tokensInput: delta.tokensInput ?? 0,
      tokensOutput: delta.tokensOutput ?? 0,
      appointmentsCreated: delta.appointmentsCreated ?? 0,
      aiResolvedCount: delta.aiResolvedCount ?? 0,
      humanHandoffCount: delta.humanHandoffCount ?? 0,
    },
    update: {
      messagesCount: delta.messagesCount ? { increment: delta.messagesCount } : undefined,
      tokensInput: delta.tokensInput ? { increment: delta.tokensInput } : undefined,
      tokensOutput: delta.tokensOutput ? { increment: delta.tokensOutput } : undefined,
      appointmentsCreated: delta.appointmentsCreated
        ? { increment: delta.appointmentsCreated }
        : undefined,
      aiResolvedCount: delta.aiResolvedCount ? { increment: delta.aiResolvedCount } : undefined,
      humanHandoffCount: delta.humanHandoffCount
        ? { increment: delta.humanHandoffCount }
        : undefined,
    },
  });
}
