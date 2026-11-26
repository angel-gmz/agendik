import { ChannelType, Plan } from "@prisma/client";
import { prisma } from "../prisma";

export interface EntitlementCheck {
  allowed: boolean;
  reason?: string;
}

export async function canActivateChannel(
  tenantId: string,
  plan: Plan,
  targetType: ChannelType
): Promise<EntitlementCheck> {
  const existing = await prisma.channelConnection.findUnique({
    where: { tenantId_type: { tenantId, type: targetType } },
  });

  if (existing?.isActive) {
    return { allowed: true };
  }

  const activeCount = await prisma.channelConnection.count({
    where: { tenantId, isActive: true },
  });

  if (activeCount >= plan.maxChannels) {
    return {
      allowed: false,
      reason: `Tu plan ${plan.name} permite hasta ${plan.maxChannels} canales activos. Actualiza tu plan en Plan y Facturación para activar más canales.`,
    };
  }

  return { allowed: true };
}

export async function canAddKnowledgeDoc(
  tenantId: string,
  plan: Plan
): Promise<EntitlementCheck> {
  const docCount = await prisma.knowledgeDocument.count({ where: { tenantId } });
  if (docCount >= plan.maxKnowledgeDocs) {
    return {
      allowed: false,
      reason: `Has alcanzado el límite de ${plan.maxKnowledgeDocs} documentos de tu plan ${plan.name}. Actualiza tu plan para subir más.`,
    };
  }
  return { allowed: true };
}

export function canUseByok(plan: Plan): EntitlementCheck {
  if (!plan.allowByok) {
    return {
      allowed: false,
      reason: `Tu plan ${plan.name} no incluye BYOK (tu propia API Key). Actualiza al plan Pro o Enterprise.`,
    };
  }
  return { allowed: true };
}

export function canUseGoogleCalendar(plan: Plan): EntitlementCheck {
  if (!plan.allowGoogleCalendar) {
    return {
      allowed: false,
      reason: `Tu plan ${plan.name} no incluye sincronización con Google Calendar. Actualiza tu plan.`,
    };
  }
  return { allowed: true };
}

export async function canInviteMember(
  tenantId: string,
  plan: Plan
): Promise<EntitlementCheck> {
  const membersCount = await prisma.tenantMembership.count({ where: { tenantId } });
  if (membersCount >= plan.maxTeamMembers) {
    return {
      allowed: false,
      reason: `Tu plan ${plan.name} permite hasta ${plan.maxTeamMembers} miembros de equipo. Actualiza tu plan para invitar más asesores.`,
    };
  }
  return { allowed: true };
}

export async function getTenantResourceCounts(tenantId: string) {
  const [activeChannels, knowledgeDocs, teamMembers] = await Promise.all([
    prisma.channelConnection.count({ where: { tenantId, isActive: true } }),
    prisma.knowledgeDocument.count({ where: { tenantId } }),
    prisma.tenantMembership.count({ where: { tenantId } }),
  ]);

  return { activeChannels, knowledgeDocs, teamMembers };
}
